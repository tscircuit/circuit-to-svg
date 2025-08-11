import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      lib: resolve(__dirname, "lib"),
    },
  },
  define: {
    global: {},
  },
})
