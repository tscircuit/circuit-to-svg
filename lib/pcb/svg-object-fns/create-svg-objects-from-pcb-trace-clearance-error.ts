import type {
  AnyCircuitElement,
  PcbPadTraceClearanceError,
  PcbViaTraceClearanceError,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../../lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

type PcbTraceClearanceError =
  | PcbPadTraceClearanceError
  | PcbViaTraceClearanceError

function annotateError(
  objects: SvgObject[],
  errorType: PcbTraceClearanceError["type"],
): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": object.attributes?.["data-type"] ?? errorType,
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
  }))
}

export function createSvgObjectsFromPcbTraceClearanceError(
  error: PcbTraceClearanceError,
  _circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { shouldDrawErrors, transform } = ctx
  if (!shouldDrawErrors) return []

  const center = error.center
  if (!center || typeof center.x !== "number" || typeof center.y !== "number") {
    return []
  }

  const screenCenter = applyToPoint(transform, center)
  const errorSubject =
    error.type === "pcb_pad_trace_clearance_error" ? "Pad/trace" : "Via/trace"
  const actualClearance = error.actual_clearance
  const minimumClearance = error.minimum_clearance
  const defaultMessage =
    actualClearance !== undefined && minimumClearance !== undefined
      ? `${errorSubject} clearance ${actualClearance} is below minimum ${minimumClearance}`
      : error.type === "pcb_pad_trace_clearance_error"
        ? "Pad and trace too close"
        : "Via and trace too close"
  const message = error.message ?? defaultMessage

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

  return annotateError(svgObjects, error.type)
}
