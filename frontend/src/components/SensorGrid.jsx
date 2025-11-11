// SensorGrid.jsx
import React from "react";

function val(v, fmt = (x) => x) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return fmt(v);
}

export default function SensorGrid({ lastEntry }) {
  const t = lastEntry ? val(lastEntry.temperature, (x) => `${parseFloat(x).toFixed(2)} °C`) : "—";
  const h = lastEntry ? val(lastEntry.humidity, (x) => `${parseFloat(x).toFixed(1)} %`) : "—";
  const g = lastEntry ? val(lastEntry.gas, (x) => `${parseFloat(x).toFixed(1)}`) : "—";
  const wifi = lastEntry ? val(lastEntry.wifi_rssi, (x) => `${parseFloat(x).toFixed(1)} dBm`) : "—";
  const rfm = lastEntry ? val(lastEntry.rfm_rssi, (x) => `${parseFloat(x).toFixed(2)} dBm`) : "—";
  const noise = lastEntry ? val(lastEntry.rf_noise_floor, (x) => `${parseFloat(x).toFixed(2)} dBm`) : "—";

  const smallCard = (title, value, note) => (
    <div className="p-3 rounded-xl bg-[#0b1220] border border-gray-800">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="mt-2 text-lg font-mono">{value}</div>
      {note && <div className="mt-1 text-xs text-gray-500">{note}</div>}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {smallCard("Temperature", t)}
      {smallCard("Humidity", h)}
      {smallCard("Gas (units)", g)}
      {smallCard("WiFi RSSI", wifi)}
      {smallCard("RFM RSSI", rfm, "Injected if antenna missing")}
      {smallCard("RF Noise", noise)}
    </div>
  );
}
