#!/usr/bin/env python3
# flask_backend/utils/replay_sender.py
"""
Client-side CSV replay utility.

Usage:
  python replay_sender.py --csv ../data/raw/upload.csv --url http://localhost:5000/api/data --interval 2.0 --loop

This script POSTS JSON rows (device_id, temperature, humidity, gas, wifi_rssi)
to the backend /api/data endpoint at the specified interval.
If the CSV contains rfm_rssi and rf_noise_floor columns they will be included.
"""

import argparse
import time
import requests
import pandas as pd
import os
import sys

def post_row(url, row):
    payload = {
        "device_id": str(row.get("device_id", "esp32_01")),
        "temperature": float(row.get("temperature", 0.0)),
        "humidity": float(row.get("humidity", 0.0)),
        "gas": float(row.get("gas", 0.0)),
        "wifi_rssi": float(row.get("wifi_rssi", -70.0))
    }
    if "rfm_rssi" in row and not pd.isna(row.get("rfm_rssi")):
        payload["rfm_rssi"] = float(row.get("rfm_rssi"))
    if "rf_noise_floor" in row and not pd.isna(row.get("rf_noise_floor")):
        payload["rf_noise_floor"] = float(row.get("rf_noise_floor"))
    try:
        r = requests.post(url, json=payload, timeout=5)
        print(f"[{r.status_code}] posted idx={row.name} -> {payload} ; resp={r.text.strip()}")
    except Exception as e:
        print(f"[ERROR] Failed to post idx={row.name}: {e}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to CSV file to replay")
    parser.add_argument("--url", default="http://localhost:5000/api/data", help="Backend /api/data URL")
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between posts")
    parser.add_argument("--loop", action="store_true", help="Loop indefinitely")
    parser.add_argument("--start", type=int, default=0, help="Start index (default 0)")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print("[ERROR] CSV not found:", args.csv)
        sys.exit(1)

    df = pd.read_csv(args.csv)
    n = len(df)
    if n == 0:
        print("[ERROR] CSV empty")
        sys.exit(1)

    i = args.start
    print(f"[*] Starting replay -> {args.url} (n={n}, interval={args.interval}s, loop={args.loop})")
    try:
        while True:
            row = df.iloc[i % n]
            post_row(args.url, row)
            i += 1
            if i >= n and not args.loop:
                print("[*] Finished replay.")
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("[*] Replay interrupted by user.")

if __name__ == "__main__":
    main()
