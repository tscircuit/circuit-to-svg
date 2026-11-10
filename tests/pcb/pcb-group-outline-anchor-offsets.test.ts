import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("showAnchorOffsets renders anchor offset indicators for outline-only pcb_group without crashing", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_child",
      name: "OutlineChildGroup",
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "pcb_board_1",
      outline: [
        { x: 2, y: 1 },
        { x: 10, y: 1 },
        { x: 10, y: 7 },
        { x: 2, y: 7 },
      ],
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
    showPcbGroups: true,
  })

  expect(svg).toContain('data-pcb-group-id="pcb_group_child"')
  expect(svg).toContain('class="anchor-offset-marker"')
  expect(svg).toContain('class="anchor-offset-connector"')
  expect(svg).toContain("X: 6.00mm")
  expect(svg).toContain("Y: 4.00mm")
})

test("showAnchorOffsets resolves parent anchor position from outline-only parent pcb_group and pcb_board", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_outline",
      outline: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ],
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    } as any,
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_parent_outline",
      outline: [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 6 },
        { x: 0, y: 6 },
      ],
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      center: { x: 7, y: 5 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_group_id: "pcb_group_parent_outline",
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
    showPcbGroups: true,
  })

  expect(svg).toContain('class="anchor-offset-marker"')
  expect(svg).toContain("X: 3.00mm")
  expect(svg).toContain("Y: 2.00mm")
})
