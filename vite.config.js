import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // ADICIONE ESTE BLOCO SERVER AQUI:
  server: {
    proxy: {
      '/api-tse': {
        target: 'https://divulgacandcontas.tse.jus.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tse/, '')
      }
    }
  }
})
