// AlertsPanel.jsx
import React, { useEffect, useState } from "react";

/**
 * AlertsPanel
 * Props:
 *   - lastInference: { class: "Normal"|"Interference"|"Critical", probability: 0.xx }
 *
 * Maintains an in-memory list of recent alerts (max 20). Adds a new alert when the class changes
 * or when a Critical inference occurs. Shows timestamp and confidence.
 */

const MAX_ALERTS = 20;

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function severityClass(cls) {
  if (cls === "Critical") return "text-critical bg-[#330000] border-[#5b0b0b]";
  if (cls === "Interference") return "text-interference bg-[#2b2400] border-[#4b3a00]";
  if (cls === "Normal") return "text-normal bg-[#062011] border-[#043017]";
  return "text-gray-300 bg-[#0b1220]";
}

export default function AlertsPanel({ lastInference }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!lastInference || !lastInference.class) return;
    const cls = lastInference.class;
    const prob = lastInference.probability ?? 1.0;
    const ts = new Date();
    setAlerts((prev) => {
      const last = prev[0];
      // push new alert if class changed or it's Critical (even repeated)
      if (!last || last.cls !== cls || cls === "Critical") {
        const next = [{ cls, prob, ts, label: `${cls}` }, ...prev].slice(0, MAX_ALERTS);
        return next;
      }
      // otherwise ignore duplicate Normal/Interference spam
      return prev;
    });
  }, [lastInference]);

  return (
    <div className="p-4 rounded-2xl bg-[#07121a] border border-gray-800">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-300">Alerts</div>
        <div className="text-xs text-gray-400">Recent</div>
      </div>

      <div className="mt-3 space-y-2 max-h-56 overflow-auto">
        {alerts.length === 0 ? (
          <div className="text-sm text-gray-500">No alerts yet — waiting for model or device data.</div>
        ) : (
          alerts.map((a, i) => (
            <div key={i} className="flex items-center justify-between border border-gray-800 p-2 rounded">
              <div>
                <div className="text-sm font-medium">
                  <span className={`px-2 py-0.5 mr-2 rounded text-xs font-mono ${severityClass(a.cls)} border`}>
                    {a.cls}
                  </span>
                  <span className="text-sm text-gray-200">{a.label}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {a.ts.toLocaleString()} · Confidence: <span className="font-mono">{Math.round((a.prob||0)*100)}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Alerts are generated when the environment classification changes or when a Critical state is detected.
      </div>
    </div>
  );
}
