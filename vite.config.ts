import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  resolve: {alias:[{find:/^three$/,replacement:'three/webgpu'}]},
  build: {target:'es2022',chunkSizeWarningLimit:2400,rollupOptions:{output:{manualChunks:{three:['three/webgpu','three/tsl'],physics:['@dimforge/rapier3d-compat']}}}}
});
