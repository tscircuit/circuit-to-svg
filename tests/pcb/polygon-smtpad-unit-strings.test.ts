import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("polygon smtpad points with unit strings are supported", () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board" as const,
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: "20mm",
      height: "20mm",
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_smtpad" as const,
      layer: "top" as const,
      shape: "polygon" as const,
      points: [
        { x: "-0.22597110000015164mm", y: "-0.4744973999999047mm" },
        { x: "-0.585965299999998mm", y: "-0.4744973999999047mm" },
        { x: "-0.585965299999998mm", y: "-0.17447259999994458mm" },
        { x: "-0.40595550000011826mm", y: "-0.17447259999994458mm" },
        { x: "-0.22597110000015164mm", y: "-0.354482399999938mm" },
      ],
      pcb_smtpad_id: "polygon_pad_0",
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    backgroundColor: "transparent",
  })

  expect(svg).not.toContain("NaN")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
