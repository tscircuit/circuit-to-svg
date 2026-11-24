import type { SvgObject } from "../../svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PcbTraceSegment } from "../get-pcb-trace-segments"

export function createPcbTraceStroke(
  {
    start,
    end,
    width,
    layer,
  }: Pick<PcbTraceSegment, "start" | "end" | "width" | "layer">,
  transform: Matrix,
  {
    color,
    className,
    dataType,
    shapeRendering = "crispEdges",
  }: {
    color: string
    className: string
    dataType: string
    shapeRendering?: string
  },
  extraAttributes?: Record<string, string>,
): SvgObject {
  const [x1, y1] = applyToPoint(transform, [start.x, start.y])
  const [x2, y2] = applyToPoint(transform, [end.x, end.y])
  return {
    name: "path",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: className,
      stroke: color,
      fill: "none",
      d: `M ${x1} ${y1} L ${x2} ${y2}`,
      "stroke-width": width
        ? (width * Math.abs(transform.a)).toString()
        : "0.3",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "shape-rendering": shapeRendering,
      "data-type": dataType,
      "data-pcb-layer": layer,
      ...extraAttributes,
    },
  }
}
