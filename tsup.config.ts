import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm"],
  sourcemap: true,
  external: ["tscircuit"],
  dts: true,
})
