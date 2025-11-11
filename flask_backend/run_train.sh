#!/usr/bin/env bash
# flask_backend/run_train.sh
# Wrapper to run the synthetic trainer reliably.

set -e

PYTHON=${PYTHON:-python3}
VENV_DIR=".venv"

N_SAMPLES=${N_SAMPLES:-25000}
EPOCHS=${EPOCHS:-30}
BATCH_SIZE=${BATCH_SIZE:-256}
LR=${LR:-0.001}
DEGRADE=${DEGRADE:-1}           # 1 = enable degrade, 0 = disable
DEGRADE_STRENGTH=${DEGRADE_STRENGTH:-0.6}
OUT_DIR=${OUT_DIR:-model}

echo "[*] Using python: $($PYTHON --version 2>&1)"
if [ ! -d "$VENV_DIR" ]; then
  echo "[*] Creating virtual environment..."
  $PYTHON -m venv "$VENV_DIR"
fi

# Activate
source "$VENV_DIR/bin/activate"

echo "[*] Installing requirements (if missing)..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

DEGRADE_FLAG=""
if [ "$DEGRADE" -eq 1 ]; then
  DEGRADE_FLAG="--degrade --degrade-strength ${DEGRADE_STRENGTH}"
fi

CMD="python utils/train_on_synthetic.py --generate --n-samples ${N_SAMPLES} ${DEGRADE_FLAG} --out-dir ${OUT_DIR} --epochs ${EPOCHS} --batch-size ${BATCH_SIZE} --lr ${LR}"

echo "[*] Running trainer with command:"
echo "    $CMD"

eval $CMD

echo "[+] Training finished. Check ${OUT_DIR}/model.h5 and ${OUT_DIR}/scaler.pkl"
