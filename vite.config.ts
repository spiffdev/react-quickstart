import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'https': path.resolve(__dirname, './node_modules/https-browserify/index.js'),
      'util': path.resolve(__dirname, './node_modules/util/util.js'),
      'assert': path.resolve(__dirname, './node_modules/assert/build/assert.js'),
      'path': path.resolve(__dirname, './node_modules/path-browserify/index.js'),
      'url': path.resolve(__dirname, './node_modules/url/url.js'),
      'http': path.resolve(__dirname, './node_modules/stream-http/index.js'),
    }
  }
})
