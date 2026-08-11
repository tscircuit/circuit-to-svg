import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromPcbTrace } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace"
import { identity } from "transformation-matrix"

const interpolatedTrace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "necked_trace",
  route_thickness_mode: "interpolated",
  route: [
    { route_type: "wire", x: -4.5, y: 0, width: 0.35, layer: "top" },
    { route_type: "wire", x: -3.25, y: 0, width: 0.35, layer: "top" },
    { route_type: "wire", x: -1.75, y: 0, width: 1.8, layer: "top" },
    { route_type: "wire", x: 1.75, y: 0, width: 1.8, layer: "top" },
    { route_type: "wire", x: 3.25, y: 0, width: 0.35, layer: "top" },
    { route_type: "wire", x: 4.5, y: 0, width: 0.35, layer: "top" },
  ],
}

test("renders an interpolated trace as one tapered polygon", () => {
  const svgObjects = createSvgObjectsFromPcbTrace(interpolatedTrace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.class).toBe("pcb-trace")
  expect(svgObjects[0]?.attributes?.d).toEndWith("Z")
  expect(svgObjects[0]?.attributes?.fill).toBe(DEFAULT_PCB_COLOR_MAP.copper.top)
  expect(svgObjects[0]?.attributes?.["stroke-width"]).toBeUndefined()
})

test("keeps unspecified variable widths as separate segments", () => {
  const trace: PcbTrace = {
    ...interpolatedTrace,
    pcb_trace_id: "segmented_trace",
    route_thickness_mode: undefined,
  }
  const svgObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
  })

  expect(svgObjects).toHaveLength(trace.route.length - 1)
  expect(svgObjects.every((object) => object.attributes.fill === "none")).toBe(
    true,
  )
  expect(
    svgObjects.every(
      (object) => object.attributes["stroke-width"] !== undefined,
    ),
  ).toBe(true)
})

test("renders interpolated trace soldermask as a tapered polygon", () => {
  const svgObjects = createSvgObjectsFromPcbTrace(interpolatedTrace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    showSolderMask: true,
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.class).toBe("pcb-soldermask")
  expect(svgObjects[0]?.attributes?.["data-type"]).toBe("pcb_trace_soldermask")
  expect(svgObjects[0]?.attributes?.fill).toBe(
    DEFAULT_PCB_COLOR_MAP.soldermaskWithCopperUnderneath.top,
  )
})

test("renders interpolated trace necking into pads", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 12,
      height: 5,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "left_pad",
      shape: "rect",
      x: -4.5,
      y: 0,
      width: 1.5,
      height: 2.5,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "right_pad",
      shape: "rect",
      x: 4.5,
      y: 0,
      width: 1.5,
      height: 2.5,
      layer: "top",
    },
    interpolatedTrace,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 720,
    height: 300,
    viewport: { minX: -6, maxX: 6, minY: -2.5, maxY: 2.5 },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
