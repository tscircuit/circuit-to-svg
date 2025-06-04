import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import type { SvgObject } from "lib/svg-object"

export function createSvgObjectsFromPcbComponent(
  component: any,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const { center, width, height, rotation = 0 } = component
  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`

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
      attributes: { transform: transformStr },
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
          },
        } as any,
      ],
      value: "",
    },
  ]
}
