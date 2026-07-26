import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

import fs from "node:fs";
import path from "node:path";

// Standalone SPA build for Capacitor / Android WebView
// This bypasses TanStack Start / Nitro SSR entirely — output is a plain
// static index.html + JS bundle that Capacitor can load from the asset folder.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: "capacitor-index-rename",
      closeBundle() {
        const spaHtml = path.resolve(__dirname, "dist-spa/index-spa.html");
        const targetHtml = path.resolve(__dirname, "dist-spa/index.html");
        if (fs.existsSync(spaHtml)) {
          fs.copyFileSync(spaHtml, targetHtml);
        }
      },
    },
  ],
  build: {
    outDir: "dist-spa",
    emptyOutDir: true,
    rollupOptions: {
      input: "index-spa.html",
    },
  },
});
