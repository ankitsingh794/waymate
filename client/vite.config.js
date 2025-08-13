import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// FIX: We wrap the config in a function to access the 'command' variable.
export default defineConfig(({ command }) => {
  const serverConfig = {
    port: 5173,
    strictPort: true,
    // You can add a proxy here if needed to talk to your backend API
    // proxy: {
    //   '/api': {
    //     target: 'https://localhost:5000', // Your backend server
    //     secure: false, // Important for self-signed certs
    //     changeOrigin: true,
    //   }
    // }
  };

  // FIX: Only enable HTTPS when running the local development server ('serve').
  // Vercel runs the 'build' command, so this block will be skipped during deployment.
  if (command === 'serve') {
    try {
      serverConfig.https = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
      };
    } catch (e) {
      console.error('SSL certs not found, starting dev server in HTTP. Run "mkcert localhost" to create them.');
    }
  }

  return {
    plugins: [react()],
    server: serverConfig,
  };
});