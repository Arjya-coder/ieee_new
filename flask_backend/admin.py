# flask_backend/admin.py
"""
Admin endpoints for training & model reload.

Security:
 - Requires ADMIN_TOKEN from config.py. Provide via header 'X-ADMIN-TOKEN' or JSON body 'admin_token'.

Endpoints:
 - POST /train     -> start a training job (non-blocking)
 - GET  /status    -> return job status & last log tail
 - POST /reload    -> reload model and scaler into memory (calls try_load_model from app if available)

Usage:
 - Ensure config.ADMIN_TOKEN is set (env ADMIN_TOKEN recommended for non-dev use).
"""

import os
import time
import threading
import subprocess
import shlex
from collections import deque
from flask import Blueprint, request, jsonify, current_app

# Import config
from config import ADMIN_TOKEN, TRAINER_CMD_TEMPLATE, TRAIN_DEFAULTS, TRAIN_PYTHON, MODEL_DIR, MODEL_PATH, SCALER_PATH

admin_bp = Blueprint("admin", __name__)

# Simple in-memory job state
_job_lock = threading.Lock()
_job_state = {
    "running": False,
    "pid": None,
    "start_ts": None,
    "end_ts": None,
    "exit_code": None,
    "cmd": None,
    "log_tail": deque(maxlen=200),  # keep last lines
    "thread": None
}

def check_token(req):
    """Return True if token valid; supports header or JSON body param."""
    token = None
    # Header first
    token = req.headers.get("X-ADMIN-TOKEN") or req.headers.get("X-ADMIN-TOKEN".lower())
    if not token:
        try:
            body = req.get_json(silent=True) or {}
            token = body.get("admin_token")
        except Exception:
            token = None
    return token == ADMIN_TOKEN

def _append_log_line(line):
    with _job_lock:
        _job_state["log_tail"].append(line)

def _run_trainer_subprocess(params):
    """
    Run trainer command in a subprocess. Capture stdout/stderr lines into log_tail.
    Update _job_state accordingly.
    """
    with _job_lock:
        if _job_state["running"]:
            return False, "A training job is already running"
        _job_state["running"] = True
        _job_state["start_ts"] = time.time()
        _job_state["end_ts"] = None
        _job_state["exit_code"] = None
        _job_state["log_tail"].clear()

    # Build command string using template
    degrade_flag = "--degrade" if params.get("degrade") else ""
    cmd = TRAINER_CMD_TEMPLATE.format(
        python=TRAIN_PYTHON,
        n_samples=int(params.get("n_samples", TRAIN_DEFAULTS.get("n_samples"))),
        degrade_flag=degrade_flag,
        degrade_strength=float(params.get("degrade_strength", TRAIN_DEFAULTS.get("degrade_strength"))),
        out_dir=str(params.get("out_dir", TRAIN_DEFAULTS.get("out_dir"))),
        epochs=int(params.get("epochs", TRAIN_DEFAULTS.get("epochs"))),
        batch_size=int(params.get("batch_size", TRAIN_DEFAULTS.get("batch_size"))),
        lr=float(params.get("lr", TRAIN_DEFAULTS.get("lr")))
    )

    with _job_lock:
        _job_state["cmd"] = cmd

    def target():
        # Run the command, stream stdout/stderr
        try:
            _append_log_line(f"[trainer] starting: {cmd}")
            # Use shell for template convenience; be careful if exposing to untrusted input
            proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=os.path.dirname(__file__), text=True, bufsize=1)
            with _job_lock:
                _job_state["pid"] = proc.pid
            # Read lines
            for line in proc.stdout:
                if line is None:
                    break
                l = line.rstrip("\n")
                _append_log_line(l)
            proc.wait()
            exit_code = proc.returncode
            with _job_lock:
                _job_state["exit_code"] = exit_code
                _job_state["end_ts"] = time.time()
                _job_state["pid"] = None
                _job_state["running"] = False
            _append_log_line(f"[trainer] finished with exit code {exit_code}")
        except Exception as e:
            _append_log_line(f"[trainer] exception: {repr(e)}")
            with _job_lock:
                _job_state["running"] = False
                _job_state["end_ts"] = time.time()
                _job_state["exit_code"] = -1

    thread = threading.Thread(target=target, daemon=True)
    with _job_lock:
        _job_state["thread"] = thread
    thread.start()
    return True, "Training started"

@admin_bp.route("/train", methods=["POST"])
def start_train():
    # auth
    if not check_token(request):
        return jsonify({"ok": False, "error": "unauthorized"}), 401

    # parse params
    body = request.get_json(silent=True) or {}
    params = {
        "n_samples": int(body.get("n_samples", TRAIN_DEFAULTS.get("n_samples"))),
        "epochs": int(body.get("epochs", TRAIN_DEFAULTS.get("epochs"))),
        "batch_size": int(body.get("batch_size", TRAIN_DEFAULTS.get("batch_size"))),
        "lr": float(body.get("lr", TRAIN_DEFAULTS.get("lr"))),
        "degrade": bool(body.get("degrade", TRAIN_DEFAULTS.get("degrade"))),
        "degrade_strength": float(body.get("degrade_strength", TRAIN_DEFAULTS.get("degrade_strength"))),
        "out_dir": body.get("out_dir", TRAIN_DEFAULTS.get("out_dir"))
    }

    ok, msg = _run_trainer_subprocess(params)
    if not ok:
        return jsonify({"ok": False, "error": msg}), 400
    return jsonify({"ok": True, "message": msg, "cmd": _job_state.get("cmd")})

@admin_bp.route("/status", methods=["GET"])
def job_status():
    # auth
    if not check_token(request):
        return jsonify({"ok": False, "error": "unauthorized"}), 401

    with _job_lock:
        status = {
            "running": _job_state["running"],
            "pid": _job_state["pid"],
            "start_ts": _job_state["start_ts"],
            "end_ts": _job_state["end_ts"],
            "exit_code": _job_state["exit_code"],
            "cmd": _job_state["cmd"],
            "log_tail": list(_job_state["log_tail"])
        }
    return jsonify({"ok": True, "status": status})

def _try_reload_model_into_app():
    """
    Attempt to import the Flask app's try_load_model function and call it.
    If app.py exposes a function, call it. Otherwise, attempt to load model/scaler directly here.
    """
    # Try to import app module and call try_load_model()
    try:
        import app as appmod  # when run inside flask_backend, app.py should be importable
        if hasattr(appmod, "try_load_model"):
            appmod.try_load_model()
            _append_log_line("[admin] called app.try_load_model()")
            return True, "reloaded via app.try_load_model()"
    except Exception:
        # ignore and try direct load below
        pass

    # fallback: try direct load of model and scaler into a minimal holder in this module (no global use)
    try:
        import tensorflow as tf
        import pickle
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            with open(SCALER_PATH, "rb") as f:
                data = pickle.load(f)
            _append_log_line("[admin] loaded model and scaler into admin context (note: app may not use it until reload)")
            return True, "loaded model+scaler"
        else:
            return False, "model or scaler files not found"
    except Exception as e:
        _append_log_line(f"[admin] reload error: {repr(e)}")
        return False, f"reload exception: {repr(e)}"

@admin_bp.route("/reload", methods=["POST"])
def reload_model():
    if not check_token(request):
        return jsonify({"ok": False, "error": "unauthorized"}), 401

    ok, msg = _try_reload_model_into_app()
    status_code = 200 if ok else 500
    return jsonify({"ok": ok, "message": msg}), status_code
