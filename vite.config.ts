import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Standalone SPA build for Capacitor / Android WebView
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist-spa",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "firebase-firestore",
              test: /node_modules[\\/]@firebase[\\/]firestore[\\/]/,
              priority: 35,
              maxSize: 320 * 1024,
            },
            {
              name: "firebase-auth",
              test: /node_modules[\\/]@firebase[\\/]auth[\\/]/,
              priority: 35,
            },
            {
              name: "firebase-core",
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 30,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 25,
            },
            {
              name: "capacitor",
              test: /node_modules[\\/]@capacitor[\\/]/,
              priority: 20,
            },
            {
              name: "liquid-glass",
              test: /node_modules[\\/]liquid-glass-react[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
