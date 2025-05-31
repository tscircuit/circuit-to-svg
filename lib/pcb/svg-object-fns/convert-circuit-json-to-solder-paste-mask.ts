import type { PcbSolderPaste } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { solderPasteLayerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../pcb-context"

export function createSvgObjectsFromSolderPaste({
  solderPaste,
  ctx,
}: {
  solderPaste: PcbSolderPaste
  ctx: PcbContext
}): any {
  const { transform } = ctx
  const [x, y] = applyToPoint(transform, [solderPaste.x, solderPaste.y])

  if (solderPaste.shape === "rect" || solderPaste.shape === "rotated_rect") {
    const width = solderPaste.width * Math.abs(transform.a)
    const height = solderPaste.height * Math.abs(transform.d)

    if (solderPaste.shape === "rotated_rect" && solderPaste.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-solder-paste",
            fill: solderPasteLayerNameToColor(solderPaste.layer),
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-solderPaste.ccw_rotation})`,
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
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
        },
      },
    ]
  }
  // Implement pill-shaped SMT pad
  if (solderPaste.shape === "pill") {
    const width = solderPaste.width * Math.abs(transform.a)
    const height = solderPaste.height * Math.abs(transform.d)
    const radius = solderPaste.radius * Math.abs(transform.a)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
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
  if (solderPaste.shape === "circle") {
    const radius = solderPaste.radius * Math.abs(transform.a)

    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
        },
      },
    ]
  }
}
