// frontend/src/socket.js
import { io } from "socket.io-client";

/**
 * Socket.IO client helper.
 *
 * The backend host can be set using Vite env var VITE_BACKEND_HOST (example:
 * VITE_BACKEND_HOST="http://192.168.1.100:5000" npm run dev).
 *
 * Falls back to http://localhost:5000 by default.
 */

const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST || "http://localhost:5000";

export const socket = io(BACKEND_HOST, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
  auth: {}, // add auth token here later if needed
});

// simple logging for connection lifecycle (can be removed later)
socket.on("connect", () => {
  console.log("[socket] connected", socket.id, "to", BACKEND_HOST);
});
socket.on("connect_error", (err) => {
  console.warn("[socket] connect_error", err && err.message ? err.message : err);
});
socket.on("disconnect", (reason) => {
  console.log("[socket] disconnected:", reason);
});

export default socket;
