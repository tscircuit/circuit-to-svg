import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPinoutSvg } from "lib"
import { parseSync } from "svgson"

test("pinout includes rotated pill pads at zero, positive and negative angles", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 24,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
  ]
  const angles = [0, 90, 30, -30]
  for (const [index, angle] of angles.entries()) {
    circuit.push({
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad_${index}`,
      pcb_component_id: "component",
      shape: "rotated_pill",
      x: -9 + index * 6,
      y: 1,
      width: 4,
      height: 1.5,
      radius: 0.75,
      ccw_rotation: angle,
      layer: "top",
    })
  }

  const svg = convertCircuitJsonToPinoutSvg(circuit)
  const pads = parseSync(svg).children.filter(
    (node) => node.attributes.class === "pinout-pad",
  )
  expect(pads).toHaveLength(angles.length)
  for (const [index, pad] of pads.entries()) {
    expect(pad.attributes.transform).toContain(`rotate(${-angles[index]!})`)
    expect(Number(pad.attributes.rx)).toBeGreaterThan(0)
    expect(pad.attributes.rx).toBe(pad.attributes.ry)
    expect(pad.attributes["data-layer"]).toBe("top")
  }
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
