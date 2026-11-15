import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

function extractRatsNestLines(svg: string) {
  const tags = svg.match(/<line[^>]*data-type="pcb_rats_nest"[^>]*\/>/g) ?? []
  return tags.map((tag) => ({
    x1: Number(tag.match(/x1="([^"]+)"/)?.[1]),
    y1: Number(tag.match(/y1="([^"]+)"/)?.[1]),
    x2: Number(tag.match(/x2="([^"]+)"/)?.[1]),
    y2: Number(tag.match(/y2="([^"]+)"/)?.[1]),
  }))
}

test("createSvgObjectsForRatsNest deduplicates bidirectional lines between two connected ports", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "P1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_2",
      name: "P2",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_1",
      connected_source_port_ids: ["source_port_1", "source_port_2"],
      connected_source_net_ids: [],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      x: -4,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      source_port_id: "source_port_2",
      x: 4,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_port_id: "pcb_port_1",
      shape: "rect",
      x: -4,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_2",
      pcb_port_id: "pcb_port_2",
      shape: "rect",
      x: 4,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawRatsNest: true,
  })
  const lines = extractRatsNestLines(svg)
  expect(lines).toHaveLength(1)
  expect(
    Math.hypot(lines[0]!.x2 - lines[0]!.x1, lines[0]!.y2 - lines[0]!.y1),
  ).toBeGreaterThan(0)
})

test("createSvgObjectsForRatsNest filters rats-nest lines by ctx.layer", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_port",
      source_port_id: "sp_bottom_1",
      name: "B1",
    },
    {
      type: "source_port",
      source_port_id: "sp_bottom_2",
      name: "B2",
    },
    {
      type: "source_trace",
      source_trace_id: "st_bottom",
      connected_source_port_ids: ["sp_bottom_1", "sp_bottom_2"],
      connected_source_net_ids: [],
    },
    {
      type: "pcb_port",
      pcb_port_id: "custom_port_b1",
      source_port_id: "sp_bottom_1",
      x: -5,
      y: -2,
      layers: ["bottom"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "custom_port_b2",
      source_port_id: "sp_bottom_2",
      x: 5,
      y: -2,
      layers: ["bottom"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "custom_pad_b1",
      pcb_port_id: "custom_port_b1",
      shape: "rect",
      x: -5,
      y: -2,
      width: 1,
      height: 1,
      layer: "bottom",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "custom_pad_b2",
      pcb_port_id: "custom_port_b2",
      shape: "rect",
      x: 5,
      y: -2,
      width: 1,
      height: 1,
      layer: "bottom",
    },
  ]

  const topOnlySvg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawRatsNest: true,
    layer: "top",
  })
  expect(extractRatsNestLines(topOnlySvg)).toHaveLength(0)

  const bottomOnlySvg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawRatsNest: true,
    layer: "bottom",
  })
  const bottomLines = extractRatsNestLines(bottomOnlySvg)
  expect(bottomLines).toHaveLength(1)
  expect(
    Math.hypot(
      bottomLines[0]!.x2 - bottomLines[0]!.x1,
      bottomLines[0]!.y2 - bottomLines[0]!.y1,
    ),
  ).toBeGreaterThan(0)
})

test("createSvgObjectsForRatsNest resolves pcb_port coordinates when pads are not present", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_port",
      source_port_id: "sp_port_only_1",
      name: "PO1",
    },
    {
      type: "source_port",
      source_port_id: "sp_port_only_2",
      name: "PO2",
    },
    {
      type: "source_trace",
      source_trace_id: "st_port_only",
      connected_source_port_ids: ["sp_port_only_1", "sp_port_only_2"],
      connected_source_net_ids: [],
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_only_1",
      source_port_id: "sp_port_only_1",
      x: -3,
      y: 1,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_only_2",
      source_port_id: "sp_port_only_2",
      x: 3,
      y: 1,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawRatsNest: true,
  })
  const lines = extractRatsNestLines(svg)
  expect(lines).toHaveLength(1)
})
