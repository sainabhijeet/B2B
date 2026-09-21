import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_DEV_PROXY_TARGET?.trim() || 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
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
            const pageFeature = normalized.match(/\/src\/pages\/([^/]+)\//)?.[1];
            if (pageFeature) return `page-${pageFeature}`;
            const moduleFeature = normalized.match(/\/src\/modules\/([^/]+)\//)?.[1];
            if (moduleFeature) return `module-${moduleFeature}`;
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/storage': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
