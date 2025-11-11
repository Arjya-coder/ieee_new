// UploadDataset.jsx
import React, { useState } from "react";
import api from "../api";

export default function UploadDataset() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState(null);
  const [maskLabels, setMaskLabels] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [serverMsg, setServerMsg] = useState(null);

  const onFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setStatus("");
    setRows(null);
    setServerMsg(null);
  };

  const onUpload = async () => {
    if (!file) {
      setStatus("Select a CSV file first.");
      return;
    }
    setUploading(true);
    setStatus("Uploading...");
    try {
      const res = await api.uploadCsv(file);
      if (res && res.ok) {
        setStatus("Upload successful");
        setRows(res.rows || null);
        setServerMsg(res.message || JSON.stringify(res));
      } else {
        setStatus("Upload failed");
        setServerMsg(res || "Unknown server response");
      }
    } catch (err) {
      console.error("Upload error", err);
      setStatus("Upload error: " + (err?.response?.data?.error || err.message || err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#0f1724] border border-gray-800">
      <div className="text-xs text-gray-400">Upload Synthetic Dataset (CSV)</div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          disabled={uploading}
          className="text-sm text-gray-300"
        />
        <button
          onClick={onUpload}
          disabled={uploading || !file}
          className="ml-auto px-3 py-1 rounded bg-[#111827] hover:bg-[#1f2937] text-sm border border-gray-700"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div className="mt-3 text-sm text-gray-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={maskLabels}
            onChange={(e) => setMaskLabels(e.target.checked)}
            className="form-checkbox"
          />
          <span>Mask `label` column in UI</span>
        </label>
      </div>

      <div className="mt-3 text-sm">
        <div className="text-gray-300">Status: <span className="text-gray-100 font-mono">{status || "idle"}</span></div>
        {rows !== null && (
          <div className="text-gray-400 mt-1">Rows saved: <span className="font-mono">{rows}</span></div>
        )}
        {serverMsg && <div className="mt-2 text-xs text-gray-400">Server: {String(serverMsg)}</div>}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Note: Uploaded CSV will be saved to the backend. Use Replay controls to start server-side replay.
      </div>
    </div>
  );
}
