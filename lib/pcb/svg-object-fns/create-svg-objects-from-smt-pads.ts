import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../pcb-context"

export function createSvgObjectsFromSmtPad({
  pad,
  ctx,
}: {
  pad: PcbSmtPad
  ctx: PcbContext
}): any {
  const { transform } = ctx
  const [x, y] = applyToPoint(transform, [pad.x, pad.y])

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-pad",
            fill: layerNameToColor(pad.layer),
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
          },
        },
      ]
    }

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-pad",
          fill: layerNameToColor(pad.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
        },
      },
    ]
  }

  // Implement pill-shaped SMT pad
  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-pad",
          fill: layerNameToColor(pad.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
        },
      },
    ]
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
