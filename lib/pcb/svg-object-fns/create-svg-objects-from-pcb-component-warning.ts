import type {
  AnyCircuitElement,
  PcbComponent,
  PcbConnectorNotInAccessibleOrientationWarning,
  PcbManualEditConflictWarning,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../../lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

type PcbComponentWarning =
  | PcbConnectorNotInAccessibleOrientationWarning
  | PcbManualEditConflictWarning

const WARNING_COLOR = "rgb(255, 208, 66)"

function annotateWarning(
  objects: SvgObject[],
  warning: PcbComponentWarning,
): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": warning.type,
      "data-pcb-layer": "overlay",
    },
  }))
}

export function createSvgObjectsFromPcbComponentWarning(
  warning: PcbComponentWarning,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  if (!ctx.shouldDrawWarnings) return []

  const component = circuitJson.find(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      element.pcb_component_id === warning.pcb_component_id,
  )

  if (!component) return []

  const rotationRadians = ((component.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rotationRadians)
  const sin = Math.sin(rotationRadians)
  const halfWidth = component.width / 2
  const halfHeight = component.height / 2
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((corner) =>
    applyToPoint(ctx.transform, {
      x: component.center.x + corner.x * cos - corner.y * sin,
      y: component.center.y + corner.x * sin + corner.y * cos,
    }),
  )

  const x = Math.min(...corners.map((corner) => corner.x))
  const y = Math.min(...corners.map((corner) => corner.y))
  const maxX = Math.max(...corners.map((corner) => corner.x))
  const maxY = Math.max(...corners.map((corner) => corner.y))
  const width = maxX - x
  const height = maxY - y
  const centerX = x + width / 2

  return annotateWarning(
    [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: x.toString(),
          y: y.toString(),
          width: width.toString(),
          height: height.toString(),
          fill: "none",
          stroke: WARNING_COLOR,
          "stroke-width": "2",
          "stroke-dasharray": "6,3",
        },
        children: [],
      },
      {
        name: "text",
        type: "element",
        value: "",
        attributes: {
          x: centerX.toString(),
          y: (y - 10).toString(),
          fill: WARNING_COLOR,
          "font-family": "sans-serif",
          "font-size": "12",
          "font-weight": "600",
          "text-anchor": "middle",
        },
        children: [
          {
            type: "text",
            name: "",
            value: warning.message,
            attributes: {},
            children: [],
          },
        ],
      },
    ],
    warning,
  )
}
