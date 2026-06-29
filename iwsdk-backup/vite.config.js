import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    mkcert(),
  iwsdkDev({
    device: 'metaQuest3',
    sem: { scene: 'empty' },   // flat key, not nested under emulator
    verbose: true,
    ai: { agentMode: true }    // agentMode not mode:'agent'
  })
  ],
  server: { host: '0.0.0.0', port: 8090, open: false },
  publicDir: 'public',
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: './src/ultra-simple.js'
      }
    }
  }
});
