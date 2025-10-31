import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

export function createErrorTextOverlay(
  circuitJson: AnyCircuitElement[],
  dataType: string = "error_text_overlay",
): SvgObject | null {
  const errorElms = circuitJson.filter((elm) =>
    elm.type.endsWith("_error"),
  ) as Array<{ message?: string }>

  if (errorElms.length === 0) {
    return null
  }

  const errorMessages = errorElms
    .map((e) => e.message)
    .filter((m): m is string => !!m)

  if (errorMessages.length === 0) {
    return null
  }

  const textBlock: SvgObject = {
    name: "text",
    type: "element",
    value: "",
    attributes: {
      x: "10",
      y: "20",
      fill: "red",
      "font-family": "monospace",
      "font-size": "12px",
      "data-type": dataType,
      "data-layer": "global",
    },
    children: errorMessages.map((msg, i) => ({
      name: "tspan",
      type: "element",
      value: "",
      attributes: {
        x: "10",
        dy: i === 0 ? "0" : "1.2em",
      },
      children: [
        {
          type: "text",
          value: msg,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })),
  }

  return textBlock
}
