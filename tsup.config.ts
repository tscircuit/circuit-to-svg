import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm"],
  sourcemap: true,
  external: ["tscircuit"],
  // Bundle the phase skew dev dependency for production installs.
  noExternal: ["circuit-json-to-differential-pair-phase-skew"],
  dts: { resolve: ["circuit-json-to-differential-pair-phase-skew"] },
})
