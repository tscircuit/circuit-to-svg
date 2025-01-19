import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { resolve } from "node:path"

export default defineConfig({
  // needed because most component in @tscircuit/3d-viewer doesn't use relative path for import statement
  resolve: { alias: { "src/": "@tscircuit/3d-viewer/src/" } },

  plugins: [react(), tsconfigPaths()], // transform react component in @tscircuit/3d-viewer

  // manually transform commonjs into esm (storybook/vite quirk)
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      format: "esm",
    },
    include: [
      "jscad-fiber",
      "jscad-planner",
      "jscad-electronics",
      "@jscad/modeling",
      "@jscad/regl-renderer",
      "@jscad/array-utils",
      "@jscad/stl-serializer",
    ],
  },
})
