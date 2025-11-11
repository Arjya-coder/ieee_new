#!/usr/bin/env python3
"""
train_on_synthetic.py

Standalone trainer for the AI-Enabled Wireless Environment Health Monitor.

Usage examples:

# Generate synthetic data, apply degradation ramp, train, and save model+scaler
python utils/train_on_synthetic.py --generate --n-samples 20000 --degrade --degrade-strength 0.5 --out-dir ../model --epochs 30

# Train from an uploaded CSV (dashboard upload saved to data/raw/upload.csv)
python utils/train_on_synthetic.py --input-csv ../data/raw/upload.csv --out-dir ../model --epochs 25

Outputs:
 - model.h5 (Keras saved model)
 - scaler.pkl (pickle containing scaler and label binarizer)
 - dataset_used.csv (copy of the dataset used for training) saved in out-dir
"""

import os
import argparse
import numpy as np
import pandas as pd
import pickle
from math import sqrt
from sklearn.preprocessing import StandardScaler, LabelBinarizer
from sklearn.metrics import classification_report
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical

# Import feature engineering from project utils
from utils.features import compute_features

# -------------------------
# Helpers
# -------------------------
def heat_index(T, RH):
    """Local heat_index; not used directly here because features.compute_features handles it."""
    T_f = T * 9/5 + 32
    HI_f = -42.379 + 2.04901523*T_f + 10.14333127*RH - 0.22475541*T_f*RH \
           - 6.83783e-3*T_f**2 - 5.481717e-2*RH**2 + 1.22874e-3*T_f**2*RH \
           + 8.5282e-4*T_f*RH**2 - 1.99e-6*T_f**2*RH**2
    return (HI_f - 32) * 5/9

def build_mlp(input_dim, lr=1e-3):
    model = Sequential([
        Dense(64, input_shape=(input_dim,), activation="relu"),
        Dense(32, activation="relu"),
        Dense(3, activation="softmax")
    ])
    model.compile(optimizer=Adam(lr), loss="categorical_crossentropy", metrics=["accuracy"])
    return model

# -------------------------
# Synthetic dataset generator
# -------------------------
def generate_base_samples(n, seed=42):
    rng = np.random.default_rng(seed)
    # realistic ranges (see project spec)
    temp = rng.normal(loc=26.0, scale=2.5, size=n).clip(18,40)
    hum  = rng.normal(loc=45.0, scale=8.0, size=n).clip(20,90)
    gas  = rng.normal(loc=320.0, scale=40.0, size=n).clip(150,700)
    wifi = rng.normal(loc=-62.0, scale=6.0, size=n).clip(-95,-30)
    # training rfm distribution intentionally different from antenna_stream generator
    rfm  = rng.normal(loc=-80.0, scale=6.0, size=n).clip(-120,-40)
    noise = rng.normal(loc=-100.0, scale=3.0, size=n).clip(-120,-80)

    df = pd.DataFrame({
        "device_id": ["esp32_01"] * n,
        "timestamp": pd.date_range("2025-01-01", periods=n, freq="S"),
        "temperature": np.round(temp, 3),
        "humidity": np.round(hum, 3),
        "gas": np.round(gas, 3),
        "wifi_rssi": np.round(wifi, 3),
        "rfm_rssi": np.round(rfm, 3),
        "rf_noise_floor": np.round(noise, 3)
    })
    return df

def degrade_series(df, degrade_strength=0.5):
    """
    Apply gradual degradation ramp across the dataset: wifi/rfm weaken, gas increases, noise increases.
    degrade_strength in [0,1].
    """
    n = len(df)
    ramp = np.linspace(0, 1, n)
    df = df.copy()
    df["wifi_rssi"] = df["wifi_rssi"] - (ramp * degrade_strength * 20)  # up to -20 dB degrade
    df["rfm_rssi"]  = df["rfm_rssi"]  - (ramp * degrade_strength * 25)
    df["gas"]       = df["gas"]       + (ramp * degrade_strength * 200)
    df["rf_noise_floor"] = df["rf_noise_floor"] + (ramp * degrade_strength * 10)
    return df

def label_by_thresholds(row, thresholds):
    score = 0
    if row["wifi_rssi"] < thresholds["wifi"]: score += 1
    if row["rfm_rssi"] < thresholds["rfm"]: score += 1
    if row["gas"] > thresholds["gas"]: score += 1
    if row["rf_noise_floor"] > -95: score += 1
    if score <= 1:
        return "Normal"
    elif score == 2:
        return "Interference"
    else:
        return "Critical"

# -------------------------
# Main
# -------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generate", action="store_true", help="Generate synthetic dataset")
    parser.add_argument("--n-samples", type=int, default=12000)
    parser.add_argument("--degrade", action="store_true", help="Apply gradual degradation ramp")
    parser.add_argument("--degrade-strength", type=float, default=0.5)
    parser.add_argument("--input-csv", type=str, default=None, help="Path to uploaded CSV to train on")
    parser.add_argument("--out-dir", type=str, default="../model", help="Directory to save model.h5 and scaler.pkl")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--balance", action="store_true", help="Balance classes by undersampling")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    if args.generate:
        print("[*] Generating synthetic dataset...")
        df = generate_base_samples(args.n_samples, seed=42)
        if args.degrade:
            df = degrade_series(df, degrade_strength=args.degrade_strength)
        thresholds = {"wifi": -75, "rfm": -90, "gas": 420}
        df["label"] = df.apply(lambda r: label_by_thresholds(r, thresholds), axis=1)
        dataset_df = df
    else:
        if not args.input_csv or not os.path.exists(args.input_csv):
            raise FileNotFoundError("Provide --input-csv that exists when not using --generate")
        print("[*] Loading CSV:", args.input_csv)
        dataset_df = pd.read_csv(args.input_csv)
        if "label" not in dataset_df.columns:
            print("[!] Uploaded CSV has no 'label' column; auto-labeling using thresholds.")
            thresholds = {"wifi": -75, "rfm": -90, "gas": 420}
            dataset_df["label"] = dataset_df.apply(lambda r: label_by_thresholds(r, thresholds), axis=1)

    # Save dataset used
    dataset_csv_path = os.path.join(args.out_dir, "dataset_used.csv")
    dataset_df.to_csv(dataset_csv_path, index=False)
    print("[*] dataset saved to", dataset_csv_path)

    # Feature engineering
    print("[*] Computing features...")
    features = compute_features(dataset_df)
    labels = dataset_df["label"].astype(str).values

    lb = LabelBinarizer()
    lb.fit(["Normal", "Interference", "Critical"])
    y = lb.transform(labels)
    if y.shape[1] == 1:
        y = to_categorical(y.flatten(), num_classes=3)

    # Optional balance
    if args.balance:
        print("[*] Balancing classes by undersampling majority...")
        df_all = pd.concat([features, dataset_df[["label"]]], axis=1)
        groups = df_all.groupby("label")
        min_count = groups.size().min()
        dfs = [g.sample(n=min_count, random_state=42) for _, g in groups]
        balanced = pd.concat(dfs).sample(frac=1, random_state=42).reset_index(drop=True)
        features = balanced[features.columns]
        y = lb.transform(balanced["label"].values)

    # Scale
    print("[*] Scaling features...")
    scaler = StandardScaler()
    X = scaler.fit_transform(features.values)

    # Split
    n = X.shape[0]
    split = int(n * 0.8)
    idx = np.arange(n)
    np.random.seed(42)
    np.random.shuffle(idx)
    train_idx, test_idx = idx[:split], idx[split:]
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    # Build model
    print("[*] Building model...")
    model = build_mlp(X_train.shape[1], lr=args.lr)

    # Train
    print(f"[*] Training for {args.epochs} epochs...")
    model.fit(X_train, y_train, epochs=args.epochs, batch_size=args.batch_size, verbose=1,
              validation_data=(X_test, y_test))

    # Evaluate
    print("[*] Evaluating...")
    y_pred = model.predict(X_test)
    y_pred_labels = np.argmax(y_pred, axis=1)
    y_true_labels = np.argmax(y_test, axis=1)
    target_names = ["Normal", "Interference", "Critical"]
    print(classification_report(y_true_labels, y_pred_labels, target_names=target_names, zero_division=0))

    # Save model & scaler
    model_path = os.path.join(args.out_dir, "model.h5")
    scaler_path = os.path.join(args.out_dir, "scaler.pkl")
    print("[*] Saving model ->", model_path)
    model.save(model_path)
    print("[*] Saving scaler ->", scaler_path)
    with open(scaler_path, "wb") as f:
        pickle.dump({"scaler": scaler, "label_binarizer": lb}, f)

    print("[+] Training complete. Outputs written to:", args.out_dir)

if __name__ == "__main__":
    main()
