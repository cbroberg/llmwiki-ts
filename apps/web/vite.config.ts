import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const compatAliases = {
  react: 'preact/compat',
  'react-dom': 'preact/compat',
  'react-dom/test-utils': 'preact/test-utils',
  'react/jsx-runtime': 'preact/jsx-runtime',
  'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
};

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      ...compatAliases,
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3020,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3021',
        changeOrigin: false,
        ws: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
