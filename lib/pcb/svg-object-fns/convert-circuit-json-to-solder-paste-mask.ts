import type { PcbSolderPaste } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../svg-object"
import { solderPasteLayerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromSolderPaste(
  solderPaste: PcbSolderPaste,
  ctx: PcbContext,
): any {
  const { transform, layer: layerFilter } = ctx
  if (layerFilter && solderPaste.layer !== layerFilter) return []
  if (solderPaste.shape === "polygon") {
    const contours = [solderPaste.points, ...(solderPaste.holes ?? [])]
    const d = contours
      .map(
        (points) =>
          points
            .map((point, index) => {
              const position = applyToPoint(transform, point)
              return `${index === 0 ? "M" : "L"}${position.x} ${position.y}`
            })
            .join(" ") + " Z",
      )
      .join(" ")
    const polygon: SvgObject = {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-solder-paste",
        fill: solderPasteLayerNameToColor(solderPaste.layer),
        "fill-rule": "evenodd",
        d,
        "data-type": "pcb_solder_paste",
        "data-pcb-layer": solderPaste.layer,
      },
    }
    return [polygon]
  }
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
            "data-type": "pcb_solder_paste",
            "data-pcb-layer": solderPaste.layer,
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
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer,
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
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer,
        },
      },
    ]
  }
  if (solderPaste.shape === "rotated_pill") {
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
          x: (-width / 2).toString(),
          y: (-height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          transform: `translate(${x} ${y}) rotate(${-solderPaste.ccw_rotation})`,
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer,
        },
      },
    ]
  }
  // Implement oval (elliptical) solder paste
  if (solderPaste.shape === "oval") {
    const width = solderPaste.width * Math.abs(transform.a)
    const height = solderPaste.height * Math.abs(transform.d)

    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pcb-solder-paste",
          fill: solderPasteLayerNameToColor(solderPaste.layer),
          cx: x.toString(),
          cy: y.toString(),
          rx: (width / 2).toString(),
          ry: (height / 2).toString(),
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer,
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
          "data-type": "pcb_solder_paste",
          "data-pcb-layer": solderPaste.layer,
        },
      },
    ]
  }
}
