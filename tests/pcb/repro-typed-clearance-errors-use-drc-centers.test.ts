import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const pcbPort = (
  pcbPortId: string,
  sourcePortId: string,
  x: number,
  y: number,
) => ({
  type: "pcb_port",
  pcb_port_id: pcbPortId,
  source_port_id: sourcePortId,
  pcb_component_id: `${pcbPortId}_component`,
  layers: ["top"],
  x,
  y,
})

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "shared_plated_hole",
    shape: "circle",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "bottom"],
  },
  pcbPort("horizontal_start", "horizontal_source_start", -2, 1.15),
  pcbPort("horizontal_end", "horizontal_source_end", 2, 1.15),
  pcbPort("vertical_start", "vertical_source_start", -1.15, -2),
  pcbPort("vertical_end", "vertical_source_end", -1.15, 2),
  {
    type: "source_trace",
    source_trace_id: "horizontal_source_trace",
    connected_source_port_ids: [
      "horizontal_source_start",
      "horizontal_source_end",
    ],
    connected_source_net_ids: [],
  },
  {
    type: "source_trace",
    source_trace_id: "vertical_source_trace",
    connected_source_port_ids: ["vertical_source_start", "vertical_source_end"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "horizontal_trace",
    source_trace_id: "horizontal_source_trace",
    route: [
      {
        route_type: "wire",
        x: -2,
        y: 1.15,
        width: 0.2,
        layer: "top",
        start_pcb_port_id: "horizontal_start",
      },
      {
        route_type: "wire",
        x: 2,
        y: 1.15,
        width: 0.2,
        layer: "top",
        end_pcb_port_id: "horizontal_end",
      },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "vertical_trace",
    source_trace_id: "vertical_source_trace",
    route: [
      {
        route_type: "wire",
        x: -1.15,
        y: -2,
        width: 0.2,
        layer: "top",
        start_pcb_port_id: "vertical_start",
      },
      {
        route_type: "wire",
        x: -1.15,
        y: 2,
        width: 0.2,
        layer: "top",
        end_pcb_port_id: "vertical_end",
      },
    ],
  },
] as AnyCircuitElement[]

test("typed clearance errors stay at their DRC centers", () => {
  const errors = checkPadTraceClearance(circuitJson)
  expect(errors).toHaveLength(2)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors], {
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })

  const errorType = "pcb_pad_trace_clearance_error"
  const typedElements = (elementName: string) =>
    svg.match(
      new RegExp(`<${elementName}\\b[^>]*data-type="${errorType}"`, "g"),
    ) ?? []

  expect(typedElements("line")).toHaveLength(4)
  expect(typedElements("rect")).toHaveLength(2)
  expect(svg.match(/data-error-reference="obstacle"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="trace-segment"/g)).toHaveLength(2)
  const localLabels = typedElements("text")
  expect(localLabels).toHaveLength(2)
  expect(svg.match(/<tspan\b/g)).toHaveLength(2)
  expect(svg).not.toContain('data-type="pcb_trace_error"')

  const labelYPositions = localLabels.map((label) => {
    const y = label.match(/\by="([^"]+)"/)?.[1]
    if (y === undefined) throw new Error("Expected clearance label y position")
    return Number(y)
  })
  expect(Math.abs(labelYPositions[0]! - labelYPositions[1]!)).toBeGreaterThan(
    20,
  )
  expect(svg).toContain("rotate(45 400 256.875)")
  expect(svg).toContain("rotate(45 356.875 300)")
  expect(svg).not.toContain("rotate(45 400 213.75)")
  expect(svg).not.toContain("rotate(45 313.75 300)")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
