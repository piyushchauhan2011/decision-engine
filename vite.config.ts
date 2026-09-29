import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tanstackStart({
      server: { build: { inlineCss: true } },
    }),
    nitro({
      compressPublicAssets: { gzip: true, brotli: true },
      routeRules: {
        "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/images/**": { headers: { "cache-control": "public, max-age=604800" } },
      },
    }),
    viteReact(),
  ],
});
