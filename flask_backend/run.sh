#!/usr/bin/env bash
# flask_backend/run.sh
# Helper to create venv, install deps, and run the Flask+SocketIO server with eventlet.

set -e

PYTHON=${PYTHON:-python3}
VENV_DIR=".venv"

echo "[*] Using python: $(which $PYTHON)"

if [ ! -d "$VENV_DIR" ]; then
  echo "[*] Creating virtual environment..."
  $PYTHON -m venv "$VENV_DIR"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

echo "[*] Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo "[*] Installing requirements..."
pip install -r requirements.txt

# Ensure eventlet present (Socket.IO background tasks recommended)
pip install eventlet

echo "[*] Running Flask+SocketIO server (using eventlet)..."
# Use python -m to ensure venv python used
python - <<'PY'
import os, sys
os.execvp("python", ["python", "app.py"])
PY
