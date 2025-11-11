// ReplayControls.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

export default function ReplayControls() {
  const [running, setRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(2.0);
  const [loop, setLoop] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // query initial replay status
    (async () => {
      try {
        const res = await api.replayStatus();
        setRunning(!!res.running);
        setIntervalSec(res.params?.interval_s ?? 2.0);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const start = async () => {
    setStatusMsg("Starting replay...");
    try {
      const res = await api.startReplay({ interval_s: parseFloat(intervalSec), loop });
      if (res.ok) {
        setRunning(true);
        setStatusMsg("Replay running");
      } else {
        setStatusMsg("Failed to start: " + (res.error || JSON.stringify(res)));
      }
    } catch (e) {
      setStatusMsg("Start error: " + (e?.message || e));
    }
  };

  const stop = async () => {
    setStatusMsg("Stopping replay...");
    try {
      const res = await api.stopReplay();
      if (res.ok) {
        setRunning(false);
        setStatusMsg("Replay stopped");
      } else {
        setStatusMsg("Failed to stop: " + (res.error || JSON.stringify(res)));
      }
    } catch (e) {
      setStatusMsg("Stop error: " + (e?.message || e));
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#0f1724] border border-gray-800">
      <div className="text-xs text-gray-400">Replay Controls</div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-sm text-gray-300">Interval (s)</label>
        <input
          type="number"
          value={intervalSec}
          step="0.5"
          min="0.5"
          onChange={(e) => setIntervalSec(e.target.value)}
          className="ml-2 w-20 px-2 py-1 rounded bg-[#0b1220] border border-gray-700 text-sm"
        />
        <label className="ml-3 inline-flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          <span>Loop</span>
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={start}
          disabled={running}
          className="px-3 py-1 rounded bg-[#064e3b] hover:bg-[#075e48] text-sm"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!running}
          className="px-3 py-1 rounded bg-[#3f1f1f] hover:bg-[#5a1f1f] text-sm"
        >
          Stop
        </button>
        <div className="ml-auto text-sm text-gray-400">{running ? "Running" : "Stopped"}</div>
      </div>

      <div className="mt-3 text-xs text-gray-500">{statusMsg}</div>
    </div>
  );
}
