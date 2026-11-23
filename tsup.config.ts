import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm"],
  sourcemap: true,
  external: ["tscircuit"],
  // Bundle the preview until the phase skew library has an npm release.
  noExternal: ["circuit-json-to-differential-pair-phase-skew"],
  dts: { resolve: ["circuit-json-to-differential-pair-phase-skew"] },
})
