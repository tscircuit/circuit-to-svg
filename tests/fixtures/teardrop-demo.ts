import type { RenderableTeardrop } from "../../lib/pcb/get-teardrop-polygon"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"

// Top two rows: linear and quadratic. Bottom: a rotated widening taper.
type DemoTrace = Omit<PcbTrace, "route"> & {
  route: (PcbTrace["route"][number] | RenderableTeardrop)[]
}
type DemoElement = Exclude<AnyCircuitElement, { type: "pcb_trace" }> | DemoTrace
const elements: DemoElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 24,
    height: 20,
    num_layers: 4,
    thickness: 1.6,
    material: "fr4",
  },
  ...(["linear", "quadratic"] as const).flatMap((mode, i): DemoElement[] => {
    const y = 6 - i * 6
    return [
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad-${mode}`,
        pcb_component_id: "component",
        shape: "circle",
        x: -8,
        y,
        radius: 1.8,
        layer: "top",
      },
      {
        type: "pcb_trace",
        pcb_trace_id: mode,
        route: [
          {
            route_type: "teardrop",
            start: { x: -8 + Math.sqrt(1.8 ** 2 - 1.5 ** 2), y },
            end: { x: -2, y },
            start_width: 3,
            end_width: 0.5,
            width_interpolation_mode: mode,
            layer: "top",
          },
          { route_type: "wire", x: -2, y, width: 0.5, layer: "top" },
          { route_type: "wire", x: 6, y, width: 0.5, layer: "top" },
          {
            route_type: "teardrop",
            start: { x: 6, y },
            end: { x: 9 - Math.sqrt(1 - 0.7 ** 2), y },
            start_width: 0.5,
            end_width: 1.4,
            width_interpolation_mode: mode,
            layer: "top",
          },
        ],
      } satisfies DemoTrace,
      {
        type: "pcb_via",
        pcb_via_id: `via-${mode}`,
        x: 9,
        y,
        outer_diameter: 2,
        hole_diameter: 0.7,
        layers: ["top", "bottom"],
      },
    ]
  }),
  {
    type: "pcb_trace",
    pcb_trace_id: "diagonal",
    route: [
      {
        route_type: "teardrop",
        start: { x: -8, y: -8 },
        end: { x: 0, y: -4 },
        start_width: 0.5,
        end_width: 2.5,
        width_interpolation_mode: "quadratic",
        layer: "bottom",
      },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "inner",
    route: [
      {
        route_type: "teardrop",
        start: { x: 3, y: -6 },
        end: { x: 9, y: -6 },
        start_width: 2,
        end_width: 0.4,
        width_interpolation_mode: "linear",
        layer: "inner1",
      },
    ],
  },
]

// Only the new mode is ahead of the published Circuit JSON type union.
export const teardropDemo = elements as AnyCircuitElement[]
