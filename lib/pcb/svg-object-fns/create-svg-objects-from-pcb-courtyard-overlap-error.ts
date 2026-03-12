import type { AnyCircuitElement, PcbCourtyardOverlapError } from "circuit-json"
import type { SvgObject } from "../../../lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardOverlapError(
  error: PcbCourtyardOverlapError,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { transform, shouldDrawErrors } = ctx
  if (!shouldDrawErrors) return []

  const svgObjects: SvgObject[] = []

  // Find the two component centers
  const componentCenters: Array<{ x: number; y: number }> = []
  for (const compId of error.pcb_component_ids) {
    const comp = circuitJson.find(
      (el) => el.type === "pcb_component" && el.pcb_component_id === compId,
    ) as { center: { x: number; y: number } } | undefined
    if (comp) {
      componentCenters.push(comp.center)
    }
  }

  if (componentCenters.length === 0) return []

  // Midpoint between the two components (or the single found component)
  const midX =
    componentCenters.reduce((s, c) => s + c.x, 0) / componentCenters.length
  const midY =
    componentCenters.reduce((s, c) => s + c.y, 0) / componentCenters.length

  const screenMid = applyToPoint(transform, { x: midX, y: midY })

  // Red diamond at midpoint
  svgObjects.push({
    name: "rect",
    type: "element",
    attributes: {
      x: (screenMid.x - 5).toString(),
      y: (screenMid.y - 5).toString(),
      width: "10",
      height: "10",
      fill: "red",
      transform: `rotate(45 ${screenMid.x} ${screenMid.y})`,
      "data-type": "pcb_courtyard_overlap_error",
      "data-pcb-layer": "overlay",
    },
    children: [],
    value: "",
  })

  // Error message label
  svgObjects.push({
    name: "text",
    type: "element",
    attributes: {
      x: screenMid.x.toString(),
      y: (screenMid.y - 15).toString(),
      fill: "red",
      "font-family": "sans-serif",
      "font-size": "12",
      "text-anchor": "middle",
      "data-type": "pcb_courtyard_overlap_error",
      "data-pcb-layer": "overlay",
    },
    children: [
      {
        type: "text",
        value: error.message || "PCB Courtyard Overlap",
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  // Red diamond at each component center + dashed line connecting them
  for (const center of componentCenters) {
    const screenPos = applyToPoint(transform, center)
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: (screenPos.x - 5).toString(),
        y: (screenPos.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenPos.x} ${screenPos.y})`,
        "data-type": "pcb_courtyard_overlap_error",
        "data-pcb-layer": "overlay",
      },
      children: [],
      value: "",
    })
  }

  if (componentCenters.length === 2) {
    const [s1, s2] = componentCenters.map((c) => applyToPoint(transform, c))
    svgObjects.push({
      name: "line",
      type: "element",
      attributes: {
        x1: s1.x.toString(),
        y1: s1.y.toString(),
        x2: s2.x.toString(),
        y2: s2.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "4,3",
        "data-type": "pcb_courtyard_overlap_error",
        "data-pcb-layer": "overlay",
      },
      children: [],
      value: "",
    })
  }

  return svgObjects
}
