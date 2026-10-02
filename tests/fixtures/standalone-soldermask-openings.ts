import type {
  AnyCircuitElement,
  PcbSoldermaskOpening,
  PcbSilkscreenText,
  PcbSilkscreenLine,
} from "circuit-json"

export const silkText = (
  id: string,
  text: string,
  x: number,
  y: number,
  layer: "top" | "bottom",
  font_size = 0.32,
): PcbSilkscreenText => ({
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: id,
  pcb_component_id: "",
  layer,
  text,
  anchor_position: { x, y },
  anchor_alignment: "center",
  font: "tscircuit2024",
  font_size,
})

const leader = (
  id: string,
  layer: "top" | "bottom",
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PcbSilkscreenLine => ({
  type: "pcb_silkscreen_line",
  pcb_silkscreen_line_id: id,
  pcb_component_id: "",
  layer,
  x1,
  y1,
  x2,
  y2,
  stroke_width: 0.035,
})

const explanations = (["top", "bottom"] as const).flatMap((layer) => {
  // Bottom snapshots are viewed from underneath; place callouts in that view.
  const x = (value: number) => (layer === "bottom" ? -value : value)
  return [
    silkText(
      `${layer}-title`,
      layer === "top"
        ? "TOP: RECTANGULAR MASK WINDOW"
        : "BOTTOM VIEW: TRIANGULAR MASK WINDOW",
      0,
      6.1,
      layer,
      0.43,
    ),
    silkText(
      `${layer}-legend`,
      "Green = mask stays on. Tan = bare board.",
      0,
      5.3,
      layer,
    ),
    silkText(`${layer}-pour-label`, "COPPER POUR", x(-4.5), 3.6, layer),
    leader(`${layer}-pour-leader`, layer, x(-4), 3.3, x(0.2), 2.3),
    silkText(`${layer}-trace-label`, "TRACE", x(4.9), 1, layer),
    leader(`${layer}-trace-leader`, layer, x(4.5), 0.7, x(1), 0.15),
    silkText(`${layer}-masked-label`, "MASKED", x(-4.7), -0.8, layer),
    leader(`${layer}-masked-leader`, layer, x(-4.6), -0.55, x(-3.5), 0.15),
    silkText(`${layer}-substrate-label`, "BARE BOARD", 0, -1.8, layer),
    silkText(
      `${layer}-bands`,
      "Bright band = exposed trace. Pale band = exposed pour.",
      0,
      -4.1,
      layer,
      0.29,
    ),
    silkText(
      `${layer}-removal`,
      "The window removes MASK only.",
      0,
      -4.8,
      layer,
      0.36,
    ),
    silkText(
      `${layer}-continuity`,
      "Copper continues under the green mask.",
      0,
      -5.5,
      layer,
    ),
    silkText(
      `${layer}-colors`,
      "Test colors: red = top copper; blue = bottom copper.",
      0,
      -6.1,
      layer,
      0.28,
    ),
  ]
})

export const openings: PcbSoldermaskOpening[] = [
  {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "top-opening",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 4,
    height: 6,
  },
  {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "bottom-opening",
    shape: "polygon",
    layer: "bottom",
    points: [
      { x: -3, y: -3 },
      { x: 3, y: -3 },
      { x: 0, y: 3 },
    ],
  },
]
export const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 14,
    height: 14,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  ...["top", "bottom"].flatMap(
    (layer) =>
      [
        {
          type: "pcb_trace",
          pcb_trace_id: `${layer}-trace`,
          route: [
            { route_type: "wire", x: -4, y: 0, width: 0.5, layer },
            { route_type: "wire", x: 4, y: 0, width: 0.5, layer },
          ],
        },
        {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: `${layer}-pour`,
          shape: "rect",
          layer,
          covered_with_solder_mask: true,
          center: { x: 0, y: 2 },
          width: 6,
          height: 1,
        },
      ] as AnyCircuitElement[],
  ),
  ...openings,
  ...explanations,
]
export const options = {
  width: 840,
  height: 840,
  viewport: { minX: -7, minY: -7, maxX: 7, maxY: 7 },
  colorOverrides: {
    copper: { top: "#ff0000", bottom: "#0000ff" },
    substrate: "#c9a26e",
  },
}
