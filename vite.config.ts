import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 1600, rollupOptions:{output:{manualChunks:{three:['three'],physics:['@dimforge/rapier3d-compat']}}} } });
