import type { AnyCircuitElement, PcbSoldermaskOpening } from "circuit-json"

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
    width: 10,
    height: 10,
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
]
export const options = {
  width: 400,
  height: 400,
  viewport: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
  colorOverrides: {
    copper: { top: "#ff0000", bottom: "#0000ff" },
    substrate: "#c9a26e",
  },
}
