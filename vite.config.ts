import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Project Pages live at https://nuthanm.github.io/exvyn/
  base: process.env.NODE_ENV === 'production' ? '/exvyn/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
})
