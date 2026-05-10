import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import type { AnyCircuitElement } from "circuit-json"

test("through_obstacle route points should not crash updateTraceBounds", () => {
  // Minimal circuit JSON with a trace containing through_obstacle route points.
  // These store coordinates in start/end instead of top-level x/y, which
  // previously caused a ZodError in distance.parse().
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
    } as any,
    {
      type: "source_component",
      source_component_id: "sc2",
      name: "R2",
      ftype: "simple_resistor",
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc2",
      source_component_id: "sc2",
      center: { x: 10, y: 0 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp1",
      pcb_component_id: "pc1",
      source_port_id: "sp1",
      x: 1,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp2",
      pcb_component_id: "pc2",
      source_port_id: "sp2",
      x: 9,
      y: 0,
      layers: ["top"],
    },
    {
      type: "source_port",
      source_port_id: "sp1",
      source_component_id: "sc1",
      name: "pin1",
      pin_number: 1,
    } as any,
    {
      type: "source_port",
      source_port_id: "sp2",
      source_component_id: "sc2",
      name: "pin1",
      pin_number: 1,
    } as any,
    {
      type: "source_trace",
      source_trace_id: "st1",
      connected_source_port_ids: ["sp1", "sp2"],
    } as any,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      source_trace_id: "st1",
      route: [
        { route_type: "wire", x: 1, y: 0, width: 0.16, layer: "top" },
        { route_type: "wire", x: 3, y: 0, width: 0.16, layer: "top" },
        // through_obstacle stores coords in start/end, not top-level x/y
        {
          route_type: "via",
          // @ts-ignore — through_obstacle shape not in type defs
          via_type: "through_obstacle",
          start: { x: 3, y: 0 },
          end: { x: 7, y: 0 },
          from_layer: "top",
          to_layer: "bottom",
        } as any,
        { route_type: "wire", x: 7, y: 0, width: 0.16, layer: "top" },
        { route_type: "wire", x: 9, y: 0, width: 0.16, layer: "top" },
      ],
    },
  ]

  // Should not throw — previously crashed with ZodError on distance.parse(undefined)
  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toBeDefined()
  expect(svg).toContain("<svg")
  expect(svg).toContain("</svg>")
})
