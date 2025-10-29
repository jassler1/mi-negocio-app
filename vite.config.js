import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    port: 4173,
    host: true,
    allowedHosts: [
      "centrodorsal-crosslighted-hank.ngrok-free.dev" // 👈 tu subdominio ngrok
    ]
  }
})
