// frontend/src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// initialize socket (side-effect import) — socket.js should export & connect the socket
import "./socket";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No root element found. Make sure index.html contains <div id='root'></div>");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
