import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../shared"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll('\\', '/');
          if (normalized.includes('/node_modules/react') || normalized.includes('/node_modules/@remix-run/')) {
            return 'vendor-react';
          }
          if (normalized.includes('/node_modules/lucide-react/')) return 'vendor-icons';
          if (normalized.includes('/node_modules/@tanstack/')) return 'vendor-query';
          const pageFeature = normalized.match(/\/src\/pages\/([^/]+)\//)?.[1];
          return pageFeature ? `page-${pageFeature}` : undefined;
        },
      },
    },
  },
  server: {
    port: 5174,
    /** Same-origin `/api/*` → Nest on :3000 avoids CORS and “Failed to fetch” when `VITE_API_URL` is unset in dev. */
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/storage": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
