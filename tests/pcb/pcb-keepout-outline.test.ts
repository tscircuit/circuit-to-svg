import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbKeepoutOutline } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// Dimensions from the TMDS62LEVM FID5 top-layer keepout. The Altium source
// stores a 19.685 mil centerline radius with a 46.3701 mil stroke around the
// 1 mm fiducial pad.
const centerlineRadius = 0.499999
const strokeWidth = 1.17780054
const outline = Array.from({ length: 49 }, (_, pointIndex) => {
  const angle = (pointIndex / 48) * Math.PI * 2
  return {
    x: Math.cos(angle) * centerlineRadius,
    y: Math.sin(angle) * centerlineRadius,
  }
})
const keepout: PcbKeepoutOutline = {
  type: "pcb_keepout",
  shape: "outline",
  pcb_keepout_id: "pcb_keepout_tmds62levm_fid5",
  outline,
  stroke_width: strokeWidth,
  layers: ["top"],
  description: "TMDS62LEVM FID5 copper keepout",
}
const fiducialKeepoutCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_tmds62levm_fid5_crop",
    center: { x: 0, y: 0 },
    width: 4,
    height: 4,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  keepout,
  {
    type: "pcb_smtpad",
    shape: "circle",
    pcb_smtpad_id: "pcb_smtpad_fid5_1",
    x: 0,
    y: 0,
    radius: 0.5,
    layer: "top",
    port_hints: ["FID5.1"],
  },
]

test("outline keepout stroke contributes to PCB bounds", () => {
  const bounds = getComprehensivePcbBounds([keepout])
  const outerRadius = centerlineRadius + strokeWidth / 2

  expect(bounds.minX).toBeCloseTo(-outerRadius, 6)
  expect(bounds.maxX).toBeCloseTo(outerRadius, 6)
  expect(bounds.minY).toBeCloseTo(-outerRadius, 6)
  expect(bounds.maxY).toBeCloseTo(outerRadius, 6)
})

test("renders the TMDS62LEVM FID5 outline keepout", () => {
  const svg = convertCircuitJsonToPcbSvg(fiducialKeepoutCircuit, {
    height: 500,
    layer: "top",
    width: 500,
  })

  expect(svg).toContain("pcb-keepout-outline")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
