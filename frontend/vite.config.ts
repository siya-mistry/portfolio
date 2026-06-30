import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls to the Go backend during local dev so the frontend
    // can call `/api/contact` without worrying about CORS or origins.
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
