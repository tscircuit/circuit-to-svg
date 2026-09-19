import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/pcb/convert-circuit-json-to-pcb-svg"

const scene = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 4,
    thickness: 1.6,
  },
  ...["top", "inner1", "bottom"].map((layer) => ({
    type: "pcb_trace",
    pcb_trace_id: layer,
    route: [
      { route_type: "wire", x: -5, y: 0, width: 2, layer },
      { route_type: "wire", x: 5, y: 0, width: 2, layer },
    ],
  })),
  ...["a", "b"].flatMap((net, i) => [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: net,
      shape: "rect",
      x: 0,
      y: 5 - i * 10,
      width: 2,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_via",
      pcb_via_id: net + "_via",
      x: -6,
      y: 5 - i * 10,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: net + "_hole",
      shape: "circle",
      x: 6,
      y: 5 - i * 10,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
  ]),
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "silk",
    layer: "top",
    x1: -2,
    y1: 8,
    x2: 2,
    y2: 8,
    stroke_width: 1,
  },
] as AnyCircuitElement[]
const selected = ["top", "inner1", "bottom", "a", "a_via", "a_hole"]
const render = (options = {}) =>
  convertCircuitJsonToPcbSvg(scene, {
    width: 200,
    height: 200,
    viewport: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
    backgroundColor: "transparent",
    xRayElementIds: selected,
    hiddenLayerOpacity: 0.05,
    ...options,
  })
test("X-Ray net visual snapshots", () => {
  // Selected pads, vias, and plated holes remain opaque; the other net is 5%
  // visible and silkscreen is hidden. Overlapping traces show layer ordering.
  for (const layer of ["top", "inner1", "bottom"] as const) {
    expect(render({ layer })).toMatchSvgSnapshot(
      import.meta.path,
      `x-ray-net-${layer}`,
    )
  }
  expect(
    render({ xRayElementIds: [...selected, "b", "b_via", "b_hole"] }),
  ).toMatchSvgSnapshot(import.meta.path, "x-ray-multiple-nets")

  const flagged = scene.map((el) =>
    el.type === "pcb_trace"
      ? {
          ...el,
          route: el.route.map((point) => ({
            ...point,
            is_inside_copper_pour: true,
          })),
        }
      : el,
  )
  // Trace segments normally hidden inside copper pours must remain visible.
  expect(
    convertCircuitJsonToPcbSvg(flagged, {
      width: 200,
      height: 200,
      viewport: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
      backgroundColor: "transparent",
      xRayElementIds: ["top"],
      hiddenLayerOpacity: 0,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "x-ray-trace-inside-pour")
})
