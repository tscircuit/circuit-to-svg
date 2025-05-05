import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("solder paste for smtpads", () => {
  const bottomCircuitJson = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_solder_paste",
        x: 0,
        y: 0,
        layer: "bottom",
        shape: "circle",
        radius: (2 / 2) * 0.7,
        pcb_solder_paste_id: "solder_paste_4",
        pcb_component_id: "pcb_component_0",
      },
    ],
    {
      mode: {
        type: "solder_paste",
        layer: "bottom",
      },
    },
  )
  expect(bottomCircuitJson).toMatchSvgSnapshot(import.meta.path + ".bottom")
  const topCircuitJson = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_solder_paste",
        x: 0,
        y: 0,
        layer: "top",
        shape: "circle",
        radius: (2 / 2) * 0.7,
        pcb_solder_paste_id: "solder_paste_4",
        pcb_component_id: "pcb_component_0",
      },
    ],
    {
      mode: {
        type: "solder_paste",
        layer: "top",
      },
    },
  )
  expect(topCircuitJson).toMatchSvgSnapshot(import.meta.path + ".top")
})
