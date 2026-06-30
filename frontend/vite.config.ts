import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});

// The contact endpoint is a Vercel serverless function at `api/contact.ts`.
// To exercise it locally (not just `npm run dev`), run `vercel dev` — it serves
// the static app AND the function together.
