// frontend/src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import { socket } from "./socket";
import StatusCard from "./components/StatusCard";
import AntennaPanel from "./components/AntennaPanel";
import ChartContainer from "./components/ChartContainer";
import UploadDataset from "./components/UploadDataset";
import ReplayControls from "./components/ReplayControls";
import AlertsPanel from "./components/AlertsPanel";
import SensorGrid from "./components/SensorGrid";
import api from "./api";

export default function App() {
  const [lastInference, setLastInference] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [antennaLast, setAntennaLast] = useState(null);
  const [connected, setConnected] = useState(false);
  const replayRef = useRef({ running: false });

  useEffect(() => {
    // Socket handlers
    const onAntenna = (payload) => {
      setAntennaLast(payload);
    };
    const onReplayRow = (payload) => {
      // payload: { entry, inference }
      setLastEntry(payload.entry || null);
      setLastInference(payload.inference || null);
    };

    socket.on("antenna_update", onAntenna);
    socket.on("replay_row", onReplayRow);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // cleanup
    return () => {
      socket.off("antenna_update", onAntenna);
      socket.off("replay_row", onReplayRow);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    // poll health once on mount
    (async () => {
      try {
        const res = await api.get("/health");
        if (res && res.model_loaded !== undefined) {
          // nothing heavy — keep for UI
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white font-sans p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Environment Health Monitor</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">{connected ? "Socket: connected" : "Socket: disconnected"}</div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-6">
        <section className="col-span-4 space-y-4">
          <StatusCard inference={lastInference} />
          <SensorGrid lastEntry={lastEntry} />
          <AntennaPanel last={antennaLast} />
        </section>

        <section className="col-span-5 space-y-4">
          <ChartContainer lastEntry={lastEntry} antennaLast={antennaLast} />
        </section>

        <section className="col-span-3 space-y-4">
          <UploadDataset />
          <ReplayControls replayRef={replayRef} />
          <AlertsPanel lastInference={lastInference} />
        </section>
      </main>

      <footer className="mt-8 text-xs text-gray-500">
        Note: Antenna stream is live only while ESP32 posts data. Model inference runs if backend has model.h5 + scaler.pkl.
      </footer>
    </div>
  );
}
