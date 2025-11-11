// StatusCard.jsx
import React from "react";

const classToStyle = {
  Normal: {
    bg: "bg-[#07140b]",
    glow: "shadow-[0_0_18px_rgba(0,255,127,0.18)]",
    accent: "text-normal",
    label: "Normal",
  },
  Interference: {
    bg: "bg-[#1a1410]",
    glow: "shadow-[0_0_14px_rgba(255,215,0,0.14)]",
    accent: "text-interference",
    label: "Interference",
  },
  Critical: {
    bg: "bg-[#201010]",
    glow: "shadow-[0_0_20px_rgba(255,49,49,0.28)] animate-pulse",
    accent: "text-critical",
    label: "Critical",
  },
  Unknown: {
    bg: "bg-[#0f1724]",
    glow: "",
    accent: "text-gray-400",
    label: "Unknown",
  },
};

export default function StatusCard({ inference }) {
  const inf = inference || null;
  const cls = inf && inf.class ? inf.class : "Unknown";
  const prob = inf && inf.probability ? Math.round(inf.probability * 100) : null;
  const s = classToStyle[cls] || classToStyle.Unknown;

  return (
    <div className={`p-4 rounded-2xl ${s.bg} ${s.glow} border border-gray-800`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-300">Environment State</div>
          <div className="mt-2 flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${s.accent} inline-block`} />
            <div>
              <div className="text-2xl font-bold leading-none">{s.label}</div>
              {prob !== null ? (
                <div className="text-sm text-gray-300 mt-1">Confidence: <span className="font-mono">{prob}%</span></div>
              ) : (
                <div className="text-sm text-gray-500 mt-1">No model loaded — using fallback rules</div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400">Device</div>
          <div className="mt-2 text-lg text-gray-200 font-mono">esp32_01</div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <strong>Notes:</strong> Antenna stream live only when device posts. Use Upload → Replay to demo instability.
      </div>
    </div>
  );
}
