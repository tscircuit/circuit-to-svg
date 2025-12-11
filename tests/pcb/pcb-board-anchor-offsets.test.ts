import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const BOARD_CENTER = { x: 25, y: 15 }

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_anchor",
    center: BOARD_CENTER,
    width: 50,
    height: 30,
  },
  {
    type: "pcb_component",
    pcb_component_id: "comp_on_board",
    source_component_id: "source_1",
    center: { x: 35, y: 22 },
    width: 5,
    height: 4,
    pcb_board_id: "board_anchor",
  },
] as any

test("components draw anchor offsets to their board", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.1)",
        stroke: "red",
      },
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
