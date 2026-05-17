import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const webPort = Number(process.env.PROMPT_DESK_WEB_PORT ?? 5175);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: false,
    proxy: {
      "/api": "http://127.0.0.1:4317"
    }
  }
});
