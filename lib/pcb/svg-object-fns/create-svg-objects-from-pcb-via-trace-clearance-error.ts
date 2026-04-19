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
        object.attributes?.["data-type"] ?? "pcb_via_trace_clearance_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
  }))
}

export function createSvgObjectsFromPcbViaTraceClearanceError(
  error: AnyCircuitElement,
  _circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { shouldDrawErrors, transform } = ctx
  if (!shouldDrawErrors) return []

  const center = (error as any).center
  if (!center || typeof center.x !== "number" || typeof center.y !== "number") {
    return []
  }

  const screenCenter = applyToPoint(transform, center)

  const actualClearance = (error as any).actual_clearance
  const minimumClearance = (error as any).minimum_clearance
  const defaultMessage =
    actualClearance && minimumClearance
      ? `Via/trace clearance ${actualClearance} is below minimum ${minimumClearance}`
      : "Via and trace too close"

  const message = (error as any).message ?? defaultMessage

  const svgObjects: SvgObject[] = [
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: {
        x: (screenCenter.x - 5).toString(),
        y: (screenCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenCenter.x} ${screenCenter.y})`,
      },
      children: [],
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: screenCenter.x.toString(),
        y: (screenCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          name: "",
          value: message,
          attributes: {},
          children: [],
        },
      ],
    },
  ]

  return annotateError(svgObjects)
}
