import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import circuitJson from "../assets/repro-pinrow3-smd-ra-male.json"

test("repro: include rectangular courtyard in PCB bounds", () => {
  const rectangularCourtyard = circuitJson.filter(
    (element) => element.type === "pcb_courtyard_rect",
  ) as AnyCircuitElement[]
  const bounds = getComprehensivePcbBounds(rectangularCourtyard)

  expect(bounds.minX).toBeCloseTo(-4.31, 6)
  expect(bounds.maxX).toBeCloseTo(4.31, 6)
  expect(bounds.minY).toBeCloseTo(-1.77, 6)
  expect(bounds.maxY).toBeCloseTo(1.77, 6)
})

test("repro: render pinrow3_smd_ra_male circuit JSON", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as AnyCircuitElement[], {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
