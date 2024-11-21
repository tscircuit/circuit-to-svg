import type { PcbSmtPad } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"

export function createSvgObjectsFromSmtPad(
  pad: PcbSmtPad,
  transform: Matrix,
): any {
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
            transform: `translate(${x} ${y}) rotate(${pad.ccw_rotation})`,
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
  // TODO implement smtpad circles/ovals etc.
  return []
}
