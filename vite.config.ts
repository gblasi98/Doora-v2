import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process'. Cast process to any to safely access cwd() in the Node-based Vite config environment.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Polyfill per evitare errori se altre librerie accedono a process.env
      'process.env': JSON.stringify(env) 
    },
    server: {
      host: true,
    },
    build: {
      outDir: 'dist',
    }
  };
});