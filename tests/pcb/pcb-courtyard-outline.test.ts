import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "../../lib/pcb/convert-circuit-json-to-pcb-svg"
import type { AnyCircuitElement } from "circuit-json"

test("pcb_courtyard_outline", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 5, y: 5 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "courtyard_1",
      pcb_component_id: "component_1",
      layer: "top",
      outline: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    },
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "courtyard_2",
      pcb_component_id: "component_2",
      layer: "bottom",
      outline: [
        { x: 1, y: 1 },
        { x: 9, y: 1 },
        { x: 9, y: 9 },
        { x: 1, y: 9 },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showCourtyards: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
