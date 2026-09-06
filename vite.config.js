import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true'
    ? '/berkeley-humanoid-lite-intro/'
    : '/',
  server: {
    // Listen on the local network so phones and computers on the same LAN can open the site.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    // Some Windows sync/antivirus setups keep old output handles alive briefly.
    // Reusing the directory keeps repeat builds deterministic in this workspace.
    emptyOutDir: false,
  },
})
