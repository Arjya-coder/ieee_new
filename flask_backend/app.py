# flask_backend/app.py
"""
Backend server for AI-Enabled Wireless Environment Health Monitor.

Features:
- /api/data: Accepts JSON POSTs from ESP32 (temperature, humidity, gas, wifi_rssi).
- /api/health: health check.
- /api/upload: accepts uploaded CSV (multipart/form-data 'file') -> saves to data/raw/upload.csv.
- /api/replay/start, /api/replay/stop, /api/replay/status: server-side replay of uploaded CSV into processing pipeline.
- Socket.IO antenna emitter: emits 'antenna_update' every STREAM_INTERVAL_S while ESP32 is live.
- Loads model.h5 + scaler.pkl from model path if present (separate trainer generates these).
- Logs incoming entries to data/raw/log.csv.

Place this file at: flask_backend/app.py
Make sure flask_backend/config.py and flask_backend/utils/features.py exist (we'll add them next).
Install dependencies from flask_backend/requirements.txt before running.
"""

import os
import time
import threading
import traceback
import io
import pickle

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np

from flask_socketio import SocketIO

# Import config values -- ensure config.py exists in same folder
from config import (
    MODEL_PATH,
    SCALER_PATH,
    HARDCODE_RFM,
    THRESHOLDS,
    ANTENNA_CSV_PATH,
    STREAM_KEEP_ALIVE_S,
    STREAM_INTERVAL_S,
    DATA_RAW_DIR
)

from utils.features import compute_features

# ------------------
# App & SocketIO
# ------------------
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
# in app.py (after creating `app` and `socketio`)
from admin import admin_bp
app.register_blueprint(admin_bp, url_prefix="/api/admin")

# ------------------
# Global state
# ------------------
BUFFER = []
BUFFER_LOCK = threading.Lock()
BUFFER_MAX = 5000

model = None
scaler = None
label_binarizer = None

# Antenna CSV and index
ANTENNA_DF = None
ANT_IDX = 0
ANT_IDX_LOCK = threading.Lock()

# Device activity tracking for stream
LAST_DEVICE_POST_TS = 0.0
LAST_POST_LOCK = threading.Lock()

# Replay control
replay_control = {"running": False, "lock": threading.Lock(), "params": {"interval_s": STREAM_INTERVAL_S, "loop": False}}
replay_thread_handle = None

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = DATA_RAW_DIR if 'DATA_RAW_DIR' in globals() else os.path.join(BASE_DIR, "data", "raw")
UPLOAD_PATH = os.path.join(DATA_DIR, "upload.csv")
LOG_PATH = os.path.join(DATA_DIR, "log.csv")
ANT_CSV_PATH = ANTENNA_CSV_PATH if 'ANTENNA_CSV_PATH' in globals() else os.path.join(BASE_DIR, "data", "antenna_stream.csv")

# ------------------
# Utilities
# ------------------
def try_load_model():
    global model, scaler, label_binarizer
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            import tensorflow as tf
            model = tf.keras.models.load_model(MODEL_PATH)
            with open(SCALER_PATH, "rb") as f:
                data = pickle.load(f)
                scaler = data.get("scaler")
                label_binarizer = data.get("label_binarizer", None)
            print("[*] Model and scaler loaded.")
        else:
            print("[*] Model or scaler not found; using fallback rules.")
    except Exception as e:
        print("[!] Exception while loading model:", e)
        traceback.print_exc()

try_load_model()

def load_antenna_df():
    global ANTENNA_DF
    if not os.path.exists(ANT_CSV_PATH):
        print(f"[!] Antenna CSV not found at {ANT_CSV_PATH}. Run utils/generate_antenna_stream.py")
        ANTENNA_DF = None
        return
    ANTENNA_DF = pd.read_csv(ANT_CSV_PATH)
    for c in ["rfm_rssi", "rf_noise_floor"]:
        if c in ANTENNA_DF.columns:
            ANTENNA_DF[c] = ANTENNA_DF[c].astype(float)
    print(f"[+] Loaded antenna CSV ({len(ANTENNA_DF)} rows).")

load_antenna_df()

def append_to_buffer(entry):
    with BUFFER_LOCK:
        BUFFER.append(entry)
        if len(BUFFER) > BUFFER_MAX:
            BUFFER.pop(0)

def perform_inference_and_respond(entry):
    append_to_buffer(entry)
    with BUFFER_LOCK:
        df = pd.DataFrame(BUFFER[-200:])
    features_df = compute_features(df)
    X_row = features_df.iloc[[-1]]

    response = {"ok": True, "inference": None, "note": "no model loaded" if model is None else "predicted"}
    if model is not None and scaler is not None:
        try:
            X_scaled = scaler.transform(X_row.values)
            pred = model.predict(X_scaled)
            idx = int(pred.argmax(axis=1)[0])
            prob = float(pred.max())
            classes = ["Normal", "Interference", "Critical"]
            response["inference"] = {"class": classes[idx], "probability": prob}
        except Exception as e:
            response["inference_error"] = str(e)
    else:
        # simple deterministic rule fallback
        score = 0
        if entry["wifi_rssi"] < THRESHOLDS["wifi"]: score += 1
        if entry["rfm_rssi"] < THRESHOLDS["rfm"]: score += 1
        if entry["gas"] > THRESHOLDS["gas"]: score += 1
        if entry["rf_noise_floor"] > -95: score += 1
        if score <= 1:
            response["inference"] = {"class": "Normal", "probability": 1.0}
        elif score == 2:
            response["inference"] = {"class": "Interference", "probability": 1.0}
        else:
            response["inference"] = {"class": "Critical", "probability": 1.0}
    return response

# ------------------
# Antenna emitter
# ------------------
def antenna_emitter_loop():
    global ANT_IDX, ANTENNA_DF, LAST_DEVICE_POST_TS
    if ANTENNA_DF is None:
        print("[!] Antenna emitter disabled: no antenna CSV loaded.")
        return
    n = len(ANTENNA_DF)
    print("[*] Antenna emitter started.")
    while True:
        try:
            with LAST_POST_LOCK:
                last = LAST_DEVICE_POST_TS
            now = time.time()
            active = (now - last) <= STREAM_KEEP_ALIVE_S
            if active:
                with ANT_IDX_LOCK:
                    row = ANTENNA_DF.iloc[ANT_IDX]
                    ANT_IDX = (ANT_IDX + 1) % n
                payload = {
                    "idx": int(row["idx"]) if "idx" in row else int(ANT_IDX),
                    "ts": str(row["ts"]) if "ts" in row else None,
                    "rfm_rssi": float(row["rfm_rssi"]),
                    "rf_noise_floor": float(row["rf_noise_floor"])
                }
                socketio.emit("antenna_update", payload, namespace="/")
                # optionally append synthetic antenna to buffer for inference visibility
                if HARDCODE_RFM:
                    synthetic_entry = {
                        "timestamp": time.time(),
                        "device_id": "antenna_stream",
                        "temperature": 0.0,
                        "humidity": 0.0,
                        "gas": 0.0,
                        "wifi_rssi": -999.0,
                        "rfm_rssi": payload["rfm_rssi"],
                        "rf_noise_floor": payload["rf_noise_floor"]
                    }
                    append_to_buffer(synthetic_entry)
                socketio.sleep(STREAM_INTERVAL_S)
            else:
                socketio.sleep(1.0)
        except Exception as e:
            print("[!] Antenna emitter error:", e)
            traceback.print_exc()
            socketio.sleep(2.0)

socketio.start_background_task(antenna_emitter_loop)

# ------------------
# API endpoints
# ------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": bool(model is not None)})

@app.route("/api/data", methods=["POST"])
def receive_data():
    """
    Expects JSON with fields:
    device_id, temperature, humidity, gas, wifi_rssi
    Optional: rfm_rssi, rf_noise_floor
    """
    global LAST_DEVICE_POST_TS, ANT_IDX
    try:
        payload = request.get_json(force=True)
        required = ["device_id", "temperature", "humidity", "gas", "wifi_rssi"]
        for k in required:
            if k not in payload:
                return jsonify({"error": f"missing field {k}"}), 400

        with LAST_POST_LOCK:
            LAST_DEVICE_POST_TS = time.time()

        # choose rfm/noise
        if HARDCODE_RFM or ("rfm_rssi" not in payload) or ("rf_noise_floor" not in payload):
            if ANTENNA_DF is not None:
                with ANT_IDX_LOCK:
                    idx = ANT_IDX
                    row = ANTENNA_DF.iloc[idx]
                    ANT_IDX = (ANT_IDX + 1) % len(ANTENNA_DF)
                rfm_rssi = float(row["rfm_rssi"])
                rf_noise_floor = float(row["rf_noise_floor"])
            else:
                rfm_rssi = float(np.random.normal(-80.0, 1.0))
                rf_noise_floor = float(np.random.normal(-100.0, 1.0))
        else:
            rfm_rssi = float(payload.get("rfm_rssi"))
            rf_noise_floor = float(payload.get("rf_noise_floor"))

        entry = {
            "timestamp": time.time(),
            "device_id": payload.get("device_id"),
            "temperature": float(payload.get("temperature")),
            "humidity": float(payload.get("humidity")),
            "gas": float(payload.get("gas")),
            "wifi_rssi": float(payload.get("wifi_rssi")),
            "rfm_rssi": float(rfm_rssi),
            "rf_noise_floor": float(rf_noise_floor)
        }

        resp = perform_inference_and_respond(entry)

        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            pd.DataFrame([entry]).to_csv(LOG_PATH, mode="a", header=not os.path.exists(LOG_PATH), index=False)
        except Exception:
            pass

        return jsonify(resp)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

# ------------------
# Upload endpoint
# ------------------
def validate_upload_columns(cols):
    required = {"device_id", "temperature", "humidity", "gas", "wifi_rssi"}
    return required.issubset(set(cols))

@app.route("/api/upload", methods=["POST"])
def upload_csv():
    try:
        if "file" not in request.files:
            return jsonify({"ok": False, "error": "No 'file' in request"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"ok": False, "error": "Empty filename"}), 400

        content = file.stream.read()
        if len(content) > 50 * 1024 * 1024:
            return jsonify({"ok": False, "error": "File too large"}), 400

        df = pd.read_csv(io.BytesIO(content))
        if not validate_upload_columns(df.columns):
            return jsonify({"ok": False, "error": "CSV missing required columns (device_id,temperature,humidity,gas,wifi_rssi)"}), 400

        os.makedirs(DATA_DIR, exist_ok=True)
        df.to_csv(UPLOAD_PATH, index=False)
        return jsonify({"ok": True, "message": "Upload saved", "rows": len(df)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

# ------------------
# Replay loop & control
# ------------------
def replay_loop(interval_s=STREAM_INTERVAL_S, loop=False):
    global replay_control, ANT_IDX
    try:
        if not os.path.exists(UPLOAD_PATH):
            print("[!] No uploaded CSV to replay.")
            with replay_control["lock"]:
                replay_control["running"] = False
            return

        df = pd.read_csv(UPLOAD_PATH)
        n = len(df)
        i = 0
        print(f"[*] Replay started: {n} rows, interval {interval_s}s, loop={loop}")
        while True:
            with replay_control["lock"]:
                if not replay_control["running"]:
                    print("[*] Replay stopped.")
                    break
            if n == 0:
                socketio.sleep(interval_s)
                continue

            row = df.iloc[i % n]
            payload = {
                "device_id": row.get("device_id", "esp32_01"),
                "temperature": float(row.get("temperature", 0.0)),
                "humidity": float(row.get("humidity", 0.0)),
                "gas": float(row.get("gas", 0.0)),
                "wifi_rssi": float(row.get("wifi_rssi", -70.0))
            }
            if "rfm_rssi" in df.columns and "rf_noise_floor" in df.columns:
                payload["rfm_rssi"] = float(row.get("rfm_rssi"))
                payload["rf_noise_floor"] = float(row.get("rf_noise_floor"))

            with LAST_POST_LOCK:
                global LAST_DEVICE_POST_TS
                LAST_DEVICE_POST_TS = time.time()

            # determine rfm/noise if not provided
            if ("rfm_rssi" in payload) and ("rf_noise_floor" in payload):
                rfm_rssi = payload["rfm_rssi"]
                rf_noise_floor = payload["rf_noise_floor"]
            else:
                if ANTENNA_DF is not None:
                    with ANT_IDX_LOCK:
                        idx_local = ANT_IDX
                        row_ant = ANTENNA_DF.iloc[idx_local]
                        ANT_IDX = (ANT_IDX + 1) % len(ANTENNA_DF)
                    rfm_rssi = float(row_ant["rfm_rssi"])
                    rf_noise_floor = float(row_ant["rf_noise_floor"])
                else:
                    rfm_rssi = float(np.random.normal(-80.0, 1.0))
                    rf_noise_floor = float(np.random.normal(-100.0, 1.0))

            entry = {
                "timestamp": time.time(),
                "device_id": payload["device_id"],
                "temperature": payload["temperature"],
                "humidity": payload["humidity"],
                "gas": payload["gas"],
                "wifi_rssi": payload["wifi_rssi"],
                "rfm_rssi": rfm_rssi,
                "rf_noise_floor": rf_noise_floor
            }

            resp = perform_inference_and_respond(entry)
            socketio.emit("replay_row", {"entry": entry, "inference": resp.get("inference", None)}, namespace="/")

            try:
                os.makedirs(DATA_DIR, exist_ok=True)
                pd.DataFrame([entry]).to_csv(LOG_PATH, mode="a", header=not os.path.exists(LOG_PATH), index=False)
            except Exception:
                pass

            i += 1
            if (i >= n) and (not loop):
                with replay_control["lock"]:
                    replay_control["running"] = False
                print("[*] Replay finished (not looping).")
                break

            socketio.sleep(interval_s)

    except Exception as e:
        print("[!] Replay loop error:", e)
        traceback.print_exc()
        with replay_control["lock"]:
            replay_control["running"] = False

@app.route("/api/replay/start", methods=["POST"])
def start_replay():
    global replay_thread_handle
    try:
        j = request.get_json(force=True) or {}
        interval_s = float(j.get("interval_s", STREAM_INTERVAL_S))
        loop_flag = bool(j.get("loop", False))

        with replay_control["lock"]:
            if replay_control["running"]:
                return jsonify({"ok": False, "error": "Replay already running"}), 400
            replay_control["running"] = True
            replay_control["params"]["interval_s"] = interval_s
            replay_control["params"]["loop"] = loop_flag

        replay_thread_handle = socketio.start_background_task(replay_loop, interval_s, loop_flag)
        return jsonify({"ok": True, "message": "Replay started", "interval_s": interval_s, "loop": loop_flag})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/replay/stop", methods=["POST"])
def stop_replay():
    try:
        with replay_control["lock"]:
            if not replay_control["running"]:
                return jsonify({"ok": False, "error": "Replay not running"}), 400
            replay_control["running"] = False
        return jsonify({"ok": True, "message": "Replay stopping"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/replay/status", methods=["GET"])
def replay_status():
    with replay_control["lock"]:
        running = replay_control["running"]
        params = replay_control["params"].copy()
    return jsonify({"running": running, "params": params})

# ------------------
# Socket.IO events
# ------------------
@socketio.on("connect", namespace="/")
def on_connect():
    print("[*] Frontend connected via Socket.IO")

@socketio.on("disconnect", namespace="/")
def on_disconnect():
    print("[*] Frontend disconnected")

# ------------------
# Main
# ------------------
if __name__ == "__main__":
    print("[*] Starting Flask+SocketIO server on 0.0.0.0:5000")
    # Recommended: pip install eventlet and run with it for concurrency
    socketio.run(app, host="0.0.0.0", port=5000)
