import type { PcbSolderPaste } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { solderPasteLayerNameToColor } from "../layer-name-to-color"

export function createSvgObjectsFromSolderPaste(
  solderpaste: PcbSolderPaste,
  transform: Matrix,
): any {
  const [x, y] = applyToPoint(transform, [solderpaste.x, solderpaste.y])

  if (solderpaste.shape === "rect" || solderpaste.shape === "rotated_rect") {
    const width = solderpaste.width * Math.abs(transform.a)
    const height = solderpaste.height * Math.abs(transform.d)

    if (solderpaste.shape === "rotated_rect" && solderpaste.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-solder-paste",
            fill: solderPasteLayerNameToColor(solderpaste.layer),
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-solderpaste.ccw_rotation})`,
          },
        },
      ]
    }

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderpaste.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
        },
      },
    ]
  }
  // Implement pill-shaped SMT pad
  if (solderpaste.shape === "pill") {
    const width = solderpaste.width * Math.abs(transform.a)
    const height = solderpaste.height * Math.abs(transform.d)
    const radius = solderpaste.radius * Math.abs(transform.a)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderpaste.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
        },
      },
    ]
  }
  // Implement circle-shaped SMT pad
  if (solderpaste.shape === "circle") {
    const radius = solderpaste.radius * Math.abs(transform.a)

    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderpaste.layer),
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
        },
      },
    ]
  }
}
