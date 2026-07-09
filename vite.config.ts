import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { gatewardApi } from "./server/plugin";

// Server-side env (no VITE_ prefix) stays out of the browser bundle — the
// API key is only ever read here and inside the Vite plugin (Node).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const baseUrl = env.GATEWARD_URL || "http://localhost:8080";
  return {
    plugins: [
      react(),
      gatewardApi({
        baseUrl,
        apiKey: env.GATEWARD_API_KEY || "",
        appId: env.GATEWARD_APP_ID,
        issuer: env.GATEWARD_ISSUER || baseUrl,
      }),
    ],
    server: { port: 5173 },
  };
});
