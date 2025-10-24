import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { toNumeric } from "../utils/to-numeric"

export function createSvgObjectsFromPcbComponent(
  component: any,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const { center, width, height, rotation = 0 } = component

  const centerX = toNumeric(center?.x)
  const centerY = toNumeric(center?.y)
  if (centerX === undefined || centerY === undefined) {
    return []
  }

  const widthValue = toNumeric(width) ?? 0
  const heightValue = toNumeric(height) ?? 0
  const rotationValue = toNumeric(rotation) ?? 0

  const [x, y] = applyToPoint(transform, [centerX, centerY])
  const scaledWidth = widthValue * Math.abs(transform.a)
  const scaledHeight = heightValue * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y}) rotate(${-rotationValue}) scale(1, -1)`

  if (
    !ctx.colorMap.debugComponent?.fill &&
    !ctx.colorMap.debugComponent?.stroke
  ) {
    return []
  }

  return [
    {
      name: "g",
      type: "element",
      attributes: {
        transform: transformStr,
        "data-type": "pcb_component",
        "data-pcb-layer": component.layer ?? "top",
      },
      children: [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-component",
            x: (-scaledWidth / 2).toString(),
            y: (-scaledHeight / 2).toString(),
            width: scaledWidth.toString(),
            height: scaledHeight.toString(),
            fill: ctx.colorMap.debugComponent.fill ?? "transparent",
            stroke: ctx.colorMap.debugComponent.stroke ?? "transparent",
            "data-type": "pcb_component",
            "data-pcb-layer": component.layer ?? "top",
          },
        } as any,
      ],
      value: "",
    },
  ]
}
