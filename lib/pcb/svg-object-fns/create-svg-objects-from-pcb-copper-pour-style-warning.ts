import type { AnyCircuitElement, PcbCopperPourStyleWarning } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getCopperPourShape } from "./get-copper-pour-shape"

/** Highlight the actual copper, preserving BRep holes and curved boundaries. */
export function createSvgObjectsFromPcbCopperPourStyleWarning(
  warning: PcbCopperPourStyleWarning,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  if (!ctx.shouldDrawWarnings || (ctx.layer && ctx.layer !== warning.layer))
    return []
  const pour = circuitJson.find(
    (element) =>
      element.type === "pcb_copper_pour" &&
      element.pcb_copper_pour_id === warning.pcb_copper_pour_id,
  )
  if (pour?.type !== "pcb_copper_pour" || pour.layer !== warning.layer)
    return []
  const shape = getCopperPourShape(pour, ctx.transform)
  if (!shape) return []
  const center = applyToPoint(ctx.transform, warning.center)
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-copper-pour-style-warning",
        "data-type": warning.type,
        "data-pcb-layer": "overlay",
        "data-pcb-copper-pour-id": pour.pcb_copper_pour_id,
        "data-warning-id": warning.pcb_copper_pour_style_warning_id,
        "aria-label": warning.message,
      },
      children: [
        {
          name: "title",
          type: "element",
          value: "",
          attributes: {},
          children: [
            {
              name: "",
              type: "text",
              value: warning.message,
              attributes: {},
              children: [],
            },
          ],
        },
        {
          name: shape.elementType,
          type: "element",
          value: "",
          attributes: {
            ...shape.shapeAttributes,
            fill: "rgb(255, 208, 66)",
            "fill-opacity": "0.5",
            stroke: "rgb(255, 208, 66)",
            "stroke-width": "1.5",
            "stroke-linejoin": "round",
          },
          children: [],
        },
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: center.x.toString(),
            cy: center.y.toString(),
            r: "4",
            fill: "none",
            stroke: "rgb(255, 208, 66)",
            "stroke-width": "1.5",
          },
          children: [],
        },
      ],
    },
  ]
}
