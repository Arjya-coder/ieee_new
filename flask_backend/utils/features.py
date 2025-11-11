# flask_backend/utils/features.py
"""
Feature engineering helpers for AI-Enabled Wireless Environment Health Monitor.

Functions:
 - heat_index(T, RH)         : approximate heat index (Celsius) from temperature (C) and relative humidity (%)
 - shannon_entropy(arr, bins): Shannon entropy (bits) of an array using histogram bins
 - compute_features(df)      : given a DataFrame with raw sensor columns, compute engineered features

Expected input DataFrame columns (at minimum):
  - temperature
  - humidity
  - gas
  - wifi_rssi
  - rfm_rssi
  - rf_noise_floor

compute_features returns a DataFrame of features (no NaNs).
"""

import numpy as np
import pandas as pd
from math import sqrt

# ---------------------------
# Helper functions
# ---------------------------
def heat_index(T_celsius, RH):
    """
    Approximate heat index in Celsius.
    Uses Rothfusz-like regression by converting to Fahrenheit, applying formula, then converting back.
    Works reasonably for typical environmental ranges; used for a single sample.
    """
    # Validate inputs
    try:
        T = float(T_celsius)
        RH = float(RH)
    except Exception:
        return 0.0

    # Convert to Fahrenheit
    T_f = T * 9.0 / 5.0 + 32.0

    # Rothfusz regression (approximation)
    HI_f = (-42.379 + 2.04901523 * T_f + 10.14333127 * RH
            - 0.22475541 * T_f * RH - 6.83783e-3 * (T_f ** 2)
            - 5.481717e-2 * (RH ** 2) + 1.22874e-3 * (T_f ** 2) * RH
            + 8.5282e-4 * T_f * (RH ** 2) - 1.99e-6 * (T_f ** 2) * (RH ** 2))
    # Convert back to Celsius
    HI_c = (HI_f - 32.0) * 5.0 / 9.0
    # Protect against NaNs / unrealistic values
    if np.isnan(HI_c) or np.isinf(HI_c):
        return 0.0
    return float(HI_c)


def shannon_entropy(arr, bins=8):
    """
    Compute Shannon entropy in bits for the values in arr using histogram binning.
    Returns 0.0 for empty or constant arrays.
    """
    if arr is None or len(arr) == 0:
        return 0.0
    # Use numpy histogram with density to get probabilities
    hist, _ = np.histogram(arr, bins=bins, density=True)
    # Convert densities to probabilities over discrete bins
    # Multiply by bin width then normalize to sum to 1 approximately:
    probs = hist.copy()
    probs = probs[probs > 0]
    if probs.size == 0:
        return 0.0
    # Normalize to proper probabilities
    probs = probs / probs.sum()
    # Compute entropy (base 2)
    entropy = -np.sum(probs * np.log2(probs))
    if np.isnan(entropy) or np.isinf(entropy):
        return 0.0
    return float(entropy)


# ---------------------------
# Main feature engineering
# ---------------------------
def compute_features(df):
    """
    df: pandas.DataFrame with raw sensor columns:
        temperature, humidity, gas, wifi_rssi, rfm_rssi, rf_noise_floor

    Returns: pandas.DataFrame of engineered features (no NaNs)
        Columns returned:
        ["temperature","humidity","gas",
         "wifi_rssi","delta_rssi","wifi_var_10","wifi_entropy_10",
         "rfm_rssi","rfm_mean_10","rfm_std_10","rf_noise_floor","rf_noise_rms_10",
         "gas_rate_5","temp_hum_idx"]
    """
    if not isinstance(df, pd.DataFrame):
        raise ValueError("compute_features expects a pandas DataFrame")

    # Work on a copy to avoid side-effects
    df = df.copy().reset_index(drop=True)

    # Ensure required columns exist; if missing, fill with zeros to avoid errors
    for col in ["temperature", "humidity", "gas", "wifi_rssi", "rfm_rssi", "rf_noise_floor"]:
        if col not in df.columns:
            df[col] = 0.0

    # Rolling windows (in samples)
    window_rssi_var = 10
    window_rssi_mean = 5

    # wifi rolling mean (short)
    df["wifi_mean_5"] = df["wifi_rssi"].rolling(window=window_rssi_mean, min_periods=1).mean()
    # delta rssi = current - recent mean
    df["delta_rssi"] = df["wifi_rssi"] - df["wifi_mean_5"]
    # wifi variance over last 10 samples
    df["wifi_var_10"] = df["wifi_rssi"].rolling(window=window_rssi_var, min_periods=1).var().fillna(0.0)

    # wifi entropy over last 10 samples (compute per-row)
    wifi_values = df["wifi_rssi"].values
    ent_list = []
    n = len(wifi_values)
    for i in range(n):
        start = max(0, i - (window_rssi_var - 1))
        window = wifi_values[start:i+1]
        ent_list.append(shannon_entropy(window, bins=8))
    df["wifi_entropy_10"] = ent_list

    # rf noise RMS over last 10 samples
    def rf_noise_rms(arr):
        arr = np.array(arr)
        if arr.size == 0:
            return 0.0
        return float(np.sqrt(np.mean(arr.astype(float) ** 2)))

    df["rf_noise_rms_10"] = df["rf_noise_floor"].rolling(window=10, min_periods=1).apply(lambda x: rf_noise_rms(x)).fillna(0.0)

    # Gas rate: (gas[t] - gas[t-5]) / 5
    df["gas_rate_5"] = (df["gas"] - df["gas"].shift(5)).fillna(0.0) / 5.0

    # Temp-humidity index (heat index)
    df["temp_hum_idx"] = df.apply(lambda r: heat_index(r.get("temperature", 0.0), r.get("humidity", 0.0)), axis=1)

    # RFM mean/std over last 10 samples
    df["rfm_mean_10"] = df["rfm_rssi"].rolling(window=10, min_periods=1).mean().fillna(0.0)
    df["rfm_std_10"] = df["rfm_rssi"].rolling(window=10, min_periods=1).std().fillna(0.0)

    # Collect final feature columns
    feature_cols = [
        "temperature", "humidity", "gas",
        "wifi_rssi", "delta_rssi", "wifi_var_10", "wifi_entropy_10",
        "rfm_rssi", "rfm_mean_10", "rfm_std_10", "rf_noise_floor", "rf_noise_rms_10",
        "gas_rate_5", "temp_hum_idx"
    ]

    # Ensure all feature cols exist
    for c in feature_cols:
        if c not in df.columns:
            df[c] = 0.0

    features = df[feature_cols].fillna(0.0).astype(float)

    return features
