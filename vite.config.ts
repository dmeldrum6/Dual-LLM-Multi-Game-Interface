import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Relative base so the built app works from any folder or static host.
  base: './',
  server: { port: 5173 },
});
