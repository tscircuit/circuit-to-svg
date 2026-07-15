import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

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
  {
    type: "pcb_trace",
    pcb_trace_id: "first_trace",
    source_trace_id: "first_source_trace",
    route: [
      { route_type: "wire", x: -3, y: 1.15, width: 0.2, layer: "top" },
      { route_type: "wire", x: 2, y: 1.15, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "second_trace",
    source_trace_id: "second_source_trace",
    route: [
      { route_type: "wire", x: -2, y: 1.15, width: 0.2, layer: "top" },
      { route_type: "wire", x: 3, y: 1.15, width: 0.2, layer: "top" },
    ],
  },
] as AnyCircuitElement[]

test("keeps clearance labels only in the text overlay", () => {
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

  const markers = typedElements("rect")
  expect(markers).toHaveLength(2)
  expect(
    markers.map((marker) => marker.match(/transform="([^"]+)"/)?.[1]),
  ).toEqual(["rotate(45 381.25 256.875)", "rotate(45 418.75 256.875)"])

  expect(svg.match(/data-error-reference="trace-start"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="trace-end"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="obstacle"/g)).toHaveLength(2)
  expect(typedElements("text")).toHaveLength(0)
  expect(svg.match(/<tspan\b/g)).toHaveLength(2)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
