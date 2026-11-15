import { test, expect } from "bun:test"
import type { AnyCircuitElement, LayerRef, PcbTrace } from "circuit-json"
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

const traces = copperLayers.map<PcbTrace>((layer, index) => ({
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
}))

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 10,
    material: "fr4",
  },
  ...traces,
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

test("applies opacity without replacing the layer color", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layerOpacity: { inner1: 0.25 },
  })
  const innerTrace = /<path[^>]+data-pcb-layer="inner1"[^>]*>/u.exec(svg)?.[0]

  expect(innerTrace).toContain('stroke="rgb(255, 140, 0)"')
  expect(innerTrace).toContain('opacity="0.25"')
})

test("draws the first configured layer in front", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layerDrawingOrder: ["bottom", "top"],
  })

  expect(svg.indexOf('data-pcb-layer="bottom"')).toBeGreaterThan(
    svg.indexOf('data-pcb-layer="top"'),
  )
})

test("rejects invalid layer opacity", () => {
  expect(() =>
    convertCircuitJsonToPcbSvg(circuitJson, {
      layerOpacity: { inner1: 1.1 },
    }),
  ).toThrow("Layer opacity must be between 0 and 1: inner1")
})
