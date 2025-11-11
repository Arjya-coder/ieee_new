// AntennaPanel.jsx
import React, { useEffect, useState, useRef } from "react";

/**
 * AntennaPanel
 * Props:
 *  - last: { idx, ts, rfm_rssi, rf_noise_floor } (latest antenna payload from socket)
 *
 * Displays the latest values and a tiny sparkline of recent rfm_rssi values.
 */
export default function AntennaPanel({ last }) {
  const [history, setHistory] = useState([]);
  const maxPoints = 30;
  const canvasRef = useRef(null);

  // update history whenever new antenna payload arrives
  useEffect(() => {
    if (!last || typeof last.rfm_rssi !== "number") return;
    setHistory((h) => {
      const next = [...h, last.rfm_rssi];
      if (next.length > maxPoints) next.shift();
      return next;
    });
  }, [last]);

  // draw simple sparkline on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!history || history.length === 0) {
      // draw idle dotted line
      ctx.strokeStyle = "#334155";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    // compute scaling (note: RSSI negative values)
    const minV = Math.min(...history);
    const maxV = Math.max(...history);
    const pad = (maxV - minV) * 0.1 || 1.0;
    const vmin = minV - pad;
    const vmax = maxV + pad;

    const len = history.length;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00FFFF"; // neon cyan accent
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (maxPoints - 1)) * w;
      const v = history[i];
      const y = h - ((v - vmin) / (vmax - vmin)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // fill gradient under the line lightly
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(0,255,255,0.08)");
    grad.addColorStop(1, "rgba(0,255,255,0.00)");
    ctx.fillStyle = grad;
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }, [history]);

  const renderValue = (v) =>
    (v === null || v === undefined || Number.isNaN(v)) ? "—" : `${parseFloat(v).toFixed(2)} dBm`;

  return (
    <div className="p-4 rounded-2xl bg-[#0f1724] border border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400">Antenna Live</div>
          <div className="mt-2 text-lg font-mono">{last ? `idx ${last.idx ?? "—"}` : "Idle"}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Signal / Noise</div>
          <div className="mt-1">
            <span className="text-sm text-normal font-mono">{last ? renderValue(last.rfm_rssi) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <canvas ref={canvasRef} width={180} height={48} className="rounded" />
        <div className="text-xs text-gray-400">
          <div>Noise: <span className="font-mono">{last ? renderValue(last.rf_noise_floor) : "—"}</span></div>
          <div className="mt-1">ts: <span className="font-mono text-[11px]">{last ? (last.ts ?? "—") : "—"}</span></div>
        </div>
      </div>
    </div>
  );
}
