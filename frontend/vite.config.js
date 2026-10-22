import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // The browser only talks to Vite; Vite forwards /api to the Express backend.
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  test: { environment: 'jsdom', include: ['src/test/**/*.test.{js,jsx}'] },
});
