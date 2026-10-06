import { expect, test } from "bun:test"
import type { PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("blind and buried vias only appear on surfaces they reach", () => {
  const topBlind: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "inner1"],
  }
  const bottomBlind: PcbVia = { ...topBlind, layers: ["inner1", "bottom"] }
  const buried: PcbVia = { ...topBlind, layers: ["inner1", "inner2"] }
  const top = { layer: "top", showSolderMask: true } as const
  const bottom = { layer: "bottom", showSolderMask: true } as const

  expect(convertCircuitJsonToPcbSvg([topBlind], top)).toContain(
    'data-type="pcb_via"',
  )
  expect(convertCircuitJsonToPcbSvg([bottomBlind], bottom)).toContain(
    'data-type="pcb_via"',
  )
  expect(convertCircuitJsonToPcbSvg([topBlind], bottom)).not.toContain(
    'data-type="pcb_via"',
  )
  expect(convertCircuitJsonToPcbSvg([bottomBlind], top)).not.toContain(
    'data-type="pcb_via"',
  )
  expect(convertCircuitJsonToPcbSvg([buried], top)).not.toContain(
    'data-type="pcb_via"',
  )
  expect(convertCircuitJsonToPcbSvg([buried], bottom)).not.toContain(
    'data-type="pcb_via"',
  )
})
