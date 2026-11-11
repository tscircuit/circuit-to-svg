import type { PcbPlacementError } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

// Placement checks may attach a location and affected bounds to the diagnostic.
// Support checks additionally provide the number of surviving breakaway tabs.
type LocatedPlacementError = PcbPlacementError & {
  center?: { x: number; y: number }
  width?: number
  height?: number
  support_count?: number
}

/** Diagnostic coordinates are circuit-world points in mm (+X right, +Y up).
 * Transform the affected bounds into SVG pixels; keep labels upright. */
export function createSvgObjectsFromPcbPlacementError(
  error: LocatedPlacementError,
  ctx: PcbContext,
): SvgObject[] {
  if (!ctx.shouldDrawErrors) return []
  if (
    !error.center ||
    !Number.isFinite(error.center.x) ||
    !Number.isFinite(error.center.y)
  )
    return []
  const center = applyToPoint(ctx.transform, error.center)
  const supportError =
    typeof error.support_count === "number" &&
    Number.isFinite(error.support_count)
  const label = supportError ? "Support error" : "Placement error"
  const children: SvgObject[] = [
    {
      type: "element",
      name: "title",
      value: "",
      attributes: {},
      children: [
        {
          type: "text",
          name: "",
          value: error.message,
          attributes: {},
          children: [],
        },
      ],
    },
  ]
  const hasBounds =
    Number.isFinite(error.width) &&
    Number.isFinite(error.height) &&
    error.width! > 0 &&
    error.height! > 0
  if (hasBounds) {
    const corners = [-1, 1].flatMap((x) =>
      [-1, 1].map((y) =>
        applyToPoint(ctx.transform, {
          x: error.center!.x + (x * error.width!) / 2,
          y: error.center!.y + (y * error.height!) / 2,
        }),
      ),
    )
    const xs = corners.map((p) => p.x),
      ys = corners.map((p) => p.y)
    children.push({
      type: "element",
      name: "rect",
      value: "",
      children: [],
      attributes: {
        "data-error-region": "true",
        x: String(Math.min(...xs)),
        y: String(Math.min(...ys)),
        width: String(Math.max(...xs) - Math.min(...xs)),
        height: String(Math.max(...ys) - Math.min(...ys)),
        fill: "#ef4444",
        "fill-opacity": "0.16",
        stroke: "#ef4444",
        "stroke-width": "2",
        "stroke-dasharray": "6 3",
      },
    })
  } else {
    children.push({
      type: "element",
      name: "circle",
      value: "",
      children: [],
      attributes: {
        cx: String(center.x),
        cy: String(center.y),
        r: "9",
        fill: "#ef4444",
        "fill-opacity": "0.25",
        stroke: "#ef4444",
        "stroke-width": "2",
      },
    })
  }
  const labelY =
    center.y - (hasBounds ? (supportError ? 10 : 0) : supportError ? 40 : 26)
  const lines = supportError
    ? [label, `${error.support_count} surviving tabs`]
    : [label]
  children.push({
    type: "element",
    name: "rect",
    value: "",
    children: [],
    attributes: {
      x: String(center.x - 60),
      y: String(labelY - 12),
      width: "120",
      height: String(lines.length * 16 + 8),
      rx: "4",
      fill: "#fff",
      "fill-opacity": "0.94",
      stroke: "#ef4444",
      "stroke-width": "1",
    },
  })
  for (const [index, line] of lines.entries())
    children.push({
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x: String(center.x),
        y: String(labelY + index * 16),
        fill: "#b91c1c",
        "font-family": "sans-serif",
        "font-size": "12",
        "font-weight": index === 0 ? "bold" : "normal",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      },
      children: [
        { type: "text", name: "", value: line, attributes: {}, children: [] },
      ],
    })
  return [
    {
      type: "element",
      name: "g",
      value: "",
      attributes: {
        "data-type": "pcb_placement_error",
        "data-pcb-placement-error-id": error.pcb_placement_error_id,
        "aria-label": error.message,
        role: "img",
      },
      children,
    },
  ]
}
