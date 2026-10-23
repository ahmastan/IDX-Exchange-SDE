import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Where /api requests are forwarded during development. Defaults to the
// Express server on port 5000; set API_PROXY_TARGET to point elsewhere (e.g.
// when macOS AirPlay Receiver is holding port 5000).
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    // The guide's data flow puts React on port 3000. strictPort makes Vite
    // fail loudly instead of silently moving to 3001 if 3000 is taken.
    port: 3000,
    strictPort: true,
    // The browser only ever talks to localhost:3000, and Vite forwards /api/*
    // to Express. This is the Vite equivalent of CRA's "proxy" field in
    // package.json, and it only applies to the dev server.
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
