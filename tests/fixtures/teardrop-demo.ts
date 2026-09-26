import type {
  AnyCircuitElement,
  LayerRef,
  PcbTraceRoutePointWire,
  Point,
} from "circuit-json"
import type { TaperedWirePoint } from "../../lib/pcb/get-wire-taper-polygon"

function taper(
  start: Point,
  end: Point,
  a: number,
  b: number,
  mode: "linear" | "quadratic",
  layer: LayerRef,
): [TaperedWirePoint, PcbTraceRoutePointWire] {
  return [
    {
      route_type: "wire",
      ...start,
      width: a,
      start_width: a,
      end_width: b,
      width_interpolation_mode: mode,
      layer,
    },
    { route_type: "wire", ...end, width: b, layer },
  ]
}
// Every taper is an outgoing wire segment; no separate route type or duplicate anchors.
export const teardropDemo: AnyCircuitElement[] = [
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
  ...(["linear", "quadratic"] as const).flatMap(
    (mode, i): AnyCircuitElement[] => {
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
            ...taper(
              { x: -8 + Math.sqrt(1.8 ** 2 - 1.5 ** 2), y },
              { x: -2, y },
              3,
              0.5,
              mode,
              "top",
            ),
            ...taper(
              { x: 6, y },
              { x: 9 - Math.sqrt(1 - 0.7 ** 2), y },
              0.5,
              1.4,
              mode,
              "top",
            ),
          ],
        },
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
    },
  ),
  {
    type: "pcb_trace",
    pcb_trace_id: "diagonal",
    route: taper(
      { x: -8, y: -8 },
      { x: 0, y: -4 },
      0.5,
      2.5,
      "quadratic",
      "bottom",
    ),
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "inner",
    route: taper({ x: 3, y: -6 }, { x: 9, y: -6 }, 2, 0.4, "linear", "inner1"),
  },
]
