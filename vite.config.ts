import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative paths so Capacitor can load from android asset bundle
export default defineConfig({
  base: '',
  plugins: [react()],
  build: { outDir: 'dist' }
});
