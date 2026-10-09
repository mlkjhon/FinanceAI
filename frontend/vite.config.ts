import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
      codeSplittingOptions: {
        // A landing é a rota de entrada: fica no bundle principal para não criar
        // uma cascata JS -> chunk da rota antes do LCP. As telas do app seguem divididas.
        splitBehavior: ({ routeId }) => (routeId === '/' ? [] : undefined),
      },
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api-lyart-kappa.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
