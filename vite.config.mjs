// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindPostcss from "@tailwindcss/postcss";

const rootDir = path.resolve(process.cwd(), "src/frontend");

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(rootDir, "app"),
      "@features": path.resolve(rootDir, "features"),
      "@api": path.resolve(rootDir, "app/api"),
      "@styles": path.resolve(rootDir, "styles"),
      "@components": path.resolve(rootDir, "components"),
    },
  },
  // 🔧 WICHTIG: Tailwind v4 PostCSS-Plugin hier explizit registrieren
  css: {
    postcss: {
      plugins: [tailwindPostcss()],
    },
  },
  server: {
    port: Number(process.env.HMR_PORT || 4001),
    strictPort: false,
    host: true,
    hmr: { port: Number(process.env.HMR_PORT || 4001) },

    // ⬇️ hier ist der wichtige Teil
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "phoenix-star.de",
      "www.phoenix-star.de",
    ],
  },
  preview: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist"),
    emptyOutDir: true,
  },
});
