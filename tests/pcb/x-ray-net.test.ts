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
    hiddenLayerOpacity: 0.2,
    ...options,
  })
// Captions live outside the rendered PCB so they cannot be hidden by X-Ray mode.
const withCaption = (svg: string, title: string, lines: string[]) => {
  const escape = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  const height = 294 + lines.length * 20
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}">
    <rect width="760" height="${height}" fill="#101827" />
    <text x="24" y="30" fill="white" font-family="sans-serif" font-size="18">${escape(title)}</text>
    <g transform="translate(280 48)">${svg}</g>
    <text fill="#e2e8f0" font-family="monospace" font-size="13">${lines
      .map(
        (line, i) =>
          `<tspan x="24" y="${280 + i * 20}">${escape(line)}</tspan>`,
      )
      .join("")}</text>
  </svg>`
}

test("X-Ray net visual snapshots", () => {
  // Selected pads, vias, and plated holes remain opaque; the other net is 20%
  // visible and silkscreen is hidden. Overlapping traces show layer ordering.
  for (const layer of ["top", "inner1", "bottom"] as const) {
    expect(
      withCaption(render({ layer }), `X-Ray: ${layer} copper in front`, [
        `layer: "${layer}", hiddenLayerOpacity: 0.2`,
        'xRayElementIds: ["top", "inner1", "bottom", "a", "a_via", "a_hole"]',
        "Center: three overlapping traces; the frontmost layer supplies the color.",
        "Upper row: selected via, pad, plated hole and their drills are opaque.",
        "Lower row: unselected copper is 20% visible; drills are transparent.",
        "Board and silkscreen are hidden. Captions are added by the test only.",
      ]),
    ).toMatchSvgSnapshot(import.meta.path, `x-ray-net-${layer}`)
  }
  expect(
    withCaption(
      render({ xRayElementIds: [...selected, "b", "b_via", "b_hole"] }),
      "X-Ray: multiple selected nets",
      [
        "hiddenLayerOpacity: 0.2",
        'xRayElementIds: ["top", "inner1", "bottom",',
        '  "a", "a_via", "a_hole", "b", "b_via", "b_hole"]',
        "Both rows: selected pads, vias, plated holes and drills are opaque.",
        "All three center traces are selected; top copper is in front.",
        "Board and silkscreen remain hidden even when both nets are selected.",
      ],
    ),
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
    withCaption(
      convertCircuitJsonToPcbSvg(flagged, {
        width: 200,
        height: 200,
        viewport: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
        backgroundColor: "transparent",
        xRayElementIds: ["top"],
        hiddenLayerOpacity: 0.2,
      }),
      "X-Ray: trace segments marked as inside a copper pour",
      [
        'xRayElementIds: ["top"], hiddenLayerOpacity: 0.2',
        "pcb_trace.route: [",
        '  { route_type: "wire", ..., is_inside_copper_pour: true }, ...',
        "]",
        "Center: the selected top trace stays visible despite its route flags.",
        "All unselected copper is 20% visible; unselected drills are transparent.",
      ],
    ),
  ).toMatchSvgSnapshot(import.meta.path, "x-ray-trace-inside-pour")
})
