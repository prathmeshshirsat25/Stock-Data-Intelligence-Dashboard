import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'request-logger',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          console.log(`[Vite] Request: ${req.method} ${req.url}`);
          next();
        });
      }
    }
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})

