import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Third-party code grouped into long-lived chunks that cache independently of app releases.
const vendorChunks: Record<string, RegExp> = {
  'vendor-react': /node_modules\/(react|react-dom|scheduler|react-router|cookie|set-cookie-parser)\//,
  // Chart code is only imported by the lazily loaded dashboard, so it stays out of the initial load.
  'vendor-charts': /node_modules\/(recharts|victory-vendor|d3-[a-z-]+|internmap|decimal\.js-light|es-toolkit|eventemitter3|immer|react-redux|redux|@reduxjs|reselect|tiny-invariant)\//,
  'vendor-data': /node_modules\/(axios|@tanstack|zod|react-hook-form|@hookform)\//,
  'vendor-ui': /node_modules\//,
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return Object.keys(vendorChunks).find((name) => vendorChunks[name].test(id));
        },
      },
    },
  },
});
