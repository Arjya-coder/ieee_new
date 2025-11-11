#!/usr/bin/env python3
"""
generate_antenna_stream.py

Generates an antenna-only dataset distinct from the training distribution.

Output columns:
  - idx (int)
  - ts (ISO timestamp string, UTC)
  - rfm_rssi (float)        : RFM antenna RSSI in dBm
  - rf_noise_floor (float)  : RF noise floor in dBm

Usage:
  cd flask_backend
  python utils/generate_antenna_stream.py --out data/antenna_stream.csv --n 40000 --seed 42

The produced CSV is intentionally drawn from a different distribution than the trainer's default
(e.g., training rfm mean ~ -80 dBm). This generator uses a stronger signal (less negative mean)
and narrower variance, with occasional spikes, to be clearly distinct.
"""
import argparse
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import os

def generate_antenna(n=40000, seed=42):
    rng = np.random.default_rng(seed)

    # Distinct distribution parameters (different from training)
    # Training: mean ~ -80 dBm, sigma ~ 6
    # Here: stronger signal (less negative), smaller sigma
    rfm_mean = -50.0
    rfm_sigma = 2.5

    # Generate base RFM RSSI values
    rfm = rng.normal(loc=rfm_mean, scale=rfm_sigma, size=n)

    # Introduce rare bursts/spikes (0.2% of rows)
    spike_count = max(1, n // 500)  # 0.2%
    if spike_count > 0:
        spikes_idx = rng.choice(n, size=spike_count, replace=False)
        rfm[spikes_idx] += rng.normal(6.0, 2.0, size=len(spikes_idx))  # positive bursts (less negative)

    # RF noise floor: more negative, slightly correlated to rfm (better rfm -> slightly less negative noise)
    noise_base = rng.normal(loc=-105.0, scale=1.5, size=n)
    rf_noise = noise_base + (-(rfm - rfm_mean) * 0.02)  # small coupling term

    # Timestamps (UTC monotonic reference)
    start = datetime.utcnow()
    ts = [(start + timedelta(seconds=i)).isoformat(timespec='seconds') + "Z" for i in range(n)]

    df = pd.DataFrame({
        "idx": range(n),
        "ts": ts,
        "rfm_rssi": np.round(rfm, 3),
        "rf_noise_floor": np.round(rf_noise, 3)
    })
    return df

def main():
    parser = argparse.ArgumentParser(description="Generate antenna stream CSV (distinct distribution).")
    parser.add_argument("--out", type=str, default="../data/antenna_stream.csv", help="Output CSV path (relative to flask_backend)")
    parser.add_argument("--n", type=int, default=40000, help="Number of rows to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    out_path = os.path.abspath(args.out)
    out_dir = os.path.dirname(out_path)
    os.makedirs(out_dir, exist_ok=True)

    print(f"[*] Generating {args.n} antenna rows (seed={args.seed})...")
    df = generate_antenna(n=args.n, seed=args.seed)
    df.to_csv(out_path, index=False)
    print(f"[+] Wrote {len(df)} rows to {out_path}")

if __name__ == "__main__":
    main()
