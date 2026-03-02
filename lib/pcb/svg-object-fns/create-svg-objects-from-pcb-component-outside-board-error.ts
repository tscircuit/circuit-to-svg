import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "../../../lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

function annotateError(objects: SvgObject[]): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type":
        object.attributes?.["data-type"] ?? "pcb_component_outside_board_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
  }))
}

function getComponentBounds(
  error: AnyCircuitElement,
  circuitJson: AnyCircuitElement[],
): { min_x: number; min_y: number; max_x: number; max_y: number } | null {
  const pcbComponentId = (error as any).pcb_component_id
  if (!pcbComponentId) return ((error as any).component_bounds ?? null) as any

  const pcbComponent = circuitJson.find(
    (elm) =>
      elm.type === "pcb_component" &&
      (elm as any).pcb_component_id === pcbComponentId,
  ) as any

  if (pcbComponent?.center && pcbComponent?.width && pcbComponent?.height) {
    return {
      min_x: pcbComponent.center.x - pcbComponent.width / 2,
      max_x: pcbComponent.center.x + pcbComponent.width / 2,
      min_y: pcbComponent.center.y - pcbComponent.height / 2,
      max_y: pcbComponent.center.y + pcbComponent.height / 2,
    }
  }

  return ((error as any).component_bounds ?? null) as any
}

export function createSvgObjectsFromPcbComponentOutsideBoardError(
  error: AnyCircuitElement,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { shouldDrawErrors, transform } = ctx
  if (!shouldDrawErrors) return []

  const bounds = getComponentBounds(error, circuitJson)
  if (!bounds) return []

  const topLeft = applyToPoint(transform, { x: bounds.min_x, y: bounds.min_y })
  const bottomRight = applyToPoint(transform, {
    x: bounds.max_x,
    y: bounds.max_y,
  })

  const x = Math.min(topLeft.x, bottomRight.x)
  const y = Math.min(topLeft.y, bottomRight.y)
  const width = Math.abs(bottomRight.x - topLeft.x)
  const height = Math.abs(bottomRight.y - topLeft.y)
  const centerX = x + width / 2
  const centerY = y + height / 2

  const svgObjects: SvgObject[] = [
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: x.toString(),
        y: y.toString(),
        width: width.toString(),
        height: height.toString(),
        fill: "none",
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "4,2",
      },
      children: [],
    },
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: (centerX - 5).toString(),
        y: (centerY - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${centerX} ${centerY})`,
      },
      children: [],
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: centerX.toString(),
        y: (y - 10).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          name: "",
          value:
            (error as any).message ??
            "PCB component extends outside board boundaries",
          attributes: {},
          children: [],
        },
      ],
    },
  ]

  return annotateError(svgObjects)
}
