// frontend/src/api.js
import axios from "axios";

const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST || "http://localhost:5000";
const api = axios.create({
  baseURL: BACKEND_HOST + "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Basic helpers
export default {
  // generic GET
  get: async (path) => {
    const res = await api.get(path);
    return res.data;
  },

  // generic POST
  post: async (path, body) => {
    const res = await api.post(path, body);
    return res.data;
  },

  // upload CSV file (multipart)
  uploadCsv: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await axios.post(`${BACKEND_HOST}/api/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30000,
    });
    return res.data;
  },

  // replay controls
  startReplay: async ({ interval_s = 2.0, loop = false } = {}) => {
    const res = await api.post("/replay/start", { interval_s, loop });
    return res.data;
  },
  stopReplay: async () => {
    const res = await api.post("/replay/stop");
    return res.data;
  },
  replayStatus: async () => {
    const res = await api.get("/replay/status");
    return res.data;
  },

  // health
  health: async () => {
    const res = await api.get("/health");
    return res.data;
  },
};
