import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
  {
    type: "source_group",
    source_group_id: "source_group_0",
    name: "group0",
  },
  {
    type: "pcb_group",
    pcb_group_id: "pcb_group_0",
    source_group_id: "source_group_0",
    center: { x: 0, y: 0 },
    width: 6,
    height: 4,
    pcb_component_ids: [],
    layout_mode: "auto",
  },
]

test("pcb groups not drawn by default", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-groups-disabled")
})

test("pcb groups drawn when enabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { drawPcbGroups: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-groups-enabled")
})
