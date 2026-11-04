import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      // Calls to /api go to the FastAPI backend in dev, so no CORS setup is needed.
      // Temporary: the proxy adds the backend API key server-side so it never reaches the
      // browser. Remove once the backend auth module (session cookie) exists.
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          headers: env.BACKEND_API_KEY ? { 'X-API-Key': env.BACKEND_API_KEY } : {},
        },
      },
    },
  }
})
