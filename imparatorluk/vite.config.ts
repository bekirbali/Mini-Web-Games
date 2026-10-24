import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5181, open: true },
  preview: { port: 4174 },
  build: { target: 'es2022', outDir: 'dist' },
});
