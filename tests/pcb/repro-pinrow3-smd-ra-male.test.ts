import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJson from "../assets/repro-pinrow3-smd-ra-male.json"

test("repro: render pinrow3_smd_ra_male circuit JSON", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as AnyCircuitElement[], {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
