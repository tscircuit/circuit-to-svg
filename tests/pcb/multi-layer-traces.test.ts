import { test, expect } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const copperLayers = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
  "bottom",
] as const satisfies readonly LayerRef[]

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 10,
  },
  ...copperLayers.map((layer, index) => ({
    type: "pcb_trace",
    pcb_trace_id: `trace_${layer}`,
    source_trace_id: `source_trace_${layer}`,
    route: [
      {
        route_type: "wire",
        x: -8,
        y: -9 + index * 2,
        width: 0.4,
        layer,
      },
      {
        route_type: "wire",
        x: 8,
        y: -9 + index * 2,
        width: 0.4,
        layer,
      },
    ],
  })),
]

test("renders traces across ten copper layers", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  for (const layer of copperLayers) {
    expect(svg).toContain(`data-pcb-layer="${layer}"`)
  }

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("filters the PCB view to an inner copper layer", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, { layer: "inner8" })

  expect(svg).toContain('data-pcb-layer="inner8"')
  expect(svg).not.toContain('data-pcb-layer="inner7"')
})
