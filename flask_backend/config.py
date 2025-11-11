# flask_backend/config.py
"""
Configuration file for backend.

Adjust values as needed for your environment.
"""

import os
import secrets
import sys

# ------------------------
# Base paths
# ------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_RAW_DIR = os.path.join(DATA_DIR, "raw")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_RAW_DIR, exist_ok=True)

# ------------------------
# Model + Scaler paths
# ------------------------
MODEL_PATH = os.path.join(MODEL_DIR, "model.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

# ------------------------
# Antenna stream CSV path
# ------------------------
ANTENNA_CSV_PATH = os.path.join(DATA_DIR, "antenna_stream.csv")

# ------------------------
# Flags
# ------------------------
# If True, backend will ignore any RFM values from ESP32
# and instead use antenna CSV values or synthesized ones.
HARDCODE_RFM = True

# ------------------------
# Thresholds for rule-based fallback inference
# ------------------------
THRESHOLDS = {
    "wifi": -70,       # dBm; lower (more negative) indicates weaker signal
    "rfm": -75,        # dBm; for synthetic RFM signal
    "gas": 400         # arbitrary units; higher => more pollution/interference
}

# ------------------------
# Stream / replay settings
# ------------------------
STREAM_INTERVAL_S = 2.0       # seconds between antenna updates and replay sends
STREAM_KEEP_ALIVE_S = 10.0    # if ESP32 hasn't posted for this many seconds, pause stream

# ------------------------
# Paths used by upload & logs
# ------------------------
LOG_FILE = os.path.join(DATA_RAW_DIR, "log.csv")
UPLOAD_FILE = os.path.join(DATA_RAW_DIR, "upload.csv")

# ------------------------
# Admin / Training settings (NEW)
# ------------------------
# Admin API uses a shared secret token. Set ADMIN_TOKEN env var in production.
# Default: a randomly generated short token (only for local / dev use). Replace it if you expose server.
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN") or os.environ.get("ADMIN_SECRET") or secrets.token_hex(16)

# Trainer invocation settings:
# TRAIN_PYTHON: which python executable to run trainer with (defaults to same interpreter running the server if available)
TRAIN_PYTHON = os.environ.get("TRAIN_PYTHON") or sys.executable or "python"

# Trainer command template (will be formatted with keyword args).
# Example usage (inside admin code): TRAINER_CMD_TEMPLATE.format(python=TRAIN_PYTHON, n_samples=25000, epochs=30, out_dir="model")
TRAINER_CMD_TEMPLATE = (
    "{python} utils/train_on_synthetic.py --generate --n-samples {n_samples} "
    "{degrade_flag} --degrade-strength {degrade_strength} --out-dir {out_dir} --epochs {epochs} --batch-size {batch_size} --lr {lr}"
)

# Sensible defaults when admin endpoint triggers training
TRAIN_DEFAULTS = {
    "n_samples": int(os.environ.get("TRAIN_N_SAMPLES", "25000")),
    "epochs": int(os.environ.get("TRAIN_EPOCHS", "30")),
    "batch_size": int(os.environ.get("TRAIN_BATCH_SIZE", "256")),
    "lr": float(os.environ.get("TRAIN_LR", "0.001")),
    "degrade": os.environ.get("TRAIN_DEGRADE", "1") in ("1", "true", "True"),
    "degrade_strength": float(os.environ.get("TRAIN_DEGRADE_STRENGTH", "0.6")),
    "out_dir": os.path.join(MODEL_DIR),
}

# ------------------------
# Debug printing
# ------------------------
def print_config_summary():
    print("[CONFIG]")
    print(f"  Model path: {MODEL_PATH}")
    print(f"  Scaler path: {SCALER_PATH}")
    print(f"  Antenna CSV: {ANTENNA_CSV_PATH}")
    print(f"  HARDCODE_RFM: {HARDCODE_RFM}")
    print(f"  Thresholds: {THRESHOLDS}")
    print(f"  Stream interval: {STREAM_INTERVAL_S}s, keep-alive: {STREAM_KEEP_ALIVE_S}s")
    print(f"  Admin token set: {'YES' if ADMIN_TOKEN else 'NO'}")
    print(f"  Trainer python: {TRAIN_PYTHON}")
    print(f"  Trainer default params: {TRAIN_DEFAULTS}")

if __name__ == "__main__":
    print_config_summary()
