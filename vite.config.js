import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/ethereum': {
        target: 'https://sepolia.infura.io/v3/5dc76d758e1444e18669946ef9b04d0c',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ethereum/, '')
      }
    }
  }
})
