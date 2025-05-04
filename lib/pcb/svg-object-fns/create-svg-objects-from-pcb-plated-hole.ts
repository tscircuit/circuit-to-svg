import type { PCBPlatedHole, PcbSolderPaste } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { solderPasteLayerNameToColor } from "../layer-name-to-color"

export function createSvgObjectsFromPcbPlatedHole(
  hole: PCBPlatedHole,
  transform: any,
  solderPastes: PcbSolderPaste[] = [],
): SvgObject[] {
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const result: SvgObject[] = []

  // Helper function to add solder paste SVG element
  const addSolderPasteSvg = (shape: string, layer: string, attributes: any) => {
    result.push({
      name: shape === "circle" ? "circle" : "rect",
      type: "element",
      attributes: {
        class: `pcb-solder-paste-${layer}`,
        fill: solderPasteLayerNameToColor(layer),
        ...attributes,
      },
      value: "",
      children: [],
    })
  }

  if (hole.shape === "circle") {
    const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a)
    const outerRadius = scaledOuterWidth / 2
    const innerRadius = scaledHoleWidth / 2
    const pasteRadius = outerRadius * 0.7

    // Add solder paste for top and bottom layers
    for (const paste of solderPastes) {
      if (paste.shape === "circle") {
        addSolderPasteSvg("circle", paste.layer, {
          cx: x.toString(),
          cy: y.toString(),
          r: pasteRadius.toString(),
        })
      }
    }
    result.push({
      name: "g",
      type: "element",
      children: [
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole-outer",
            fill: "rgb(200, 52, 52)",
            cx: x.toString(),
            cy: y.toString(),
            r: outerRadius.toString(),
          },
          value: "",
          children: [],
        },
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: "rgb(255, 38, 226)",
            cx: x.toString(),
            cy: y.toString(),
            r: innerRadius.toString(),
          },
          value: "",
          children: [],
        },
      ],
      value: "",
      attributes: {},
    })
  } else if (hole.shape === "pill" || hole.shape === "oval") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.d)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.d)
    const outerRadiusX = scaledOuterWidth / 2
    const outerRadiusY = scaledOuterHeight / 2
    const innerRadiusX = scaledHoleWidth / 2
    const innerRadiusY = scaledHoleHeight / 2
    const straightLength = scaledOuterHeight - scaledOuterWidth
    const pasteWidth = scaledOuterWidth * 0.7
    const pasteHeight = scaledOuterHeight * 0.7
    const pasteRadiusX = pasteWidth / 2
    const pasteRadiusY = pasteHeight / 2

    // Add solder paste for top and bottom layers
    for (const paste of solderPastes) {
      if (paste.shape === hole.shape) {
        addSolderPasteSvg("rect", paste.layer, {
          x: (x - pasteWidth / 2).toString(),
          y: (y - pasteHeight / 2).toString(),
          width: pasteWidth.toString(),
          height: pasteHeight.toString(),
          rx: pasteRadiusX.toString(),
          ry: pasteRadiusY.toString(),
        })
      }
    }
    result.push({
      name: "g",
      type: "element",
      children: [
        {
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-hole-outer",
            fill: "rgb(200, 52, 52)",
            d:
              `M${x - outerRadiusX},${y - straightLength / 2} ` +
              `v${straightLength} ` +
              `a${outerRadiusX},${outerRadiusX} 0 0 0 ${scaledOuterWidth},0 ` +
              `v-${straightLength} ` +
              `a${outerRadiusX},${outerRadiusX} 0 0 0 -${scaledOuterWidth},0 z`,
          },
          value: "",
          children: [],
        },
        {
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: "rgb(255, 38, 226)",
            d:
              `M${x - innerRadiusX},${y - (scaledHoleHeight - scaledHoleWidth) / 2} ` +
              `v${scaledHoleHeight - scaledHoleWidth} ` +
              `a${innerRadiusX},${innerRadiusX} 0 0 0 ${scaledHoleWidth},0 ` +
              `v-${scaledHoleHeight - scaledHoleWidth} ` +
              `a${innerRadiusX},${innerRadiusX} 0 0 0 -${scaledHoleWidth},0 z`,
          },
          value: "",
          children: [],
        },
      ],
      value: "",
      attributes: {},
    })
  } else if (hole.shape === "circular_hole_with_rect_pad") {
    const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a)
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.d)
    const holeRadius = scaledHoleDiameter / 2
    const pasteWidth = scaledRectPadWidth * 0.7
    const pasteHeight = scaledRectPadHeight * 0.7

    // Add solder paste for top and bottom layers
    for (const paste of solderPastes) {
      if (paste.shape === "rect") {
        addSolderPasteSvg("rect", paste.layer, {
          x: (x - pasteWidth / 2).toString(),
          y: (y - pasteHeight / 2).toString(),
          width: pasteWidth.toString(),
          height: pasteHeight.toString(),
        })
      }
    }
    result.push({
      name: "g",
      type: "element",
      children: [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-hole-outer-pad",
            fill: "rgb(200, 52, 52)",
            x: (x - scaledRectPadWidth / 2).toString(),
            y: (y - scaledRectPadHeight / 2).toString(),
            width: scaledRectPadWidth.toString(),
            height: scaledRectPadHeight.toString(),
          },
          value: "",
          children: [],
        },
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: "rgb(255, 38, 226)",
            cx: x.toString(),
            cy: y.toString(),
            r: holeRadius.toString(),
          },
          value: "",
          children: [],
        },
      ],
      value: "",
      attributes: {},
    })
  } else if (hole.shape === "pill_hole_with_rect_pad") {
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.d)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.d)
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2
    const pasteWidth = scaledRectPadWidth * 0.7
    const pasteHeight = scaledRectPadHeight * 0.7
    const pasteRadius = holeRadius * 0.7

    // Add solder paste for top and bottom layers
    for (const paste of solderPastes) {
      if (paste.shape === "rect") {
        addSolderPasteSvg("rect", paste.layer, {
          x: (x - pasteWidth / 2).toString(),
          y: (y - pasteHeight / 2).toString(),
          width: pasteWidth.toString(),
          height: pasteHeight.toString(),
          rx: pasteRadius.toString(),
          ry: pasteRadius.toString(),
        })
      }
    }
    result.push({
      name: "g",
      type: "element",
      children: [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-hole-outer-pad",
            fill: "rgb(200, 52, 52)",
            x: (x - scaledRectPadWidth / 2).toString(),
            y: (y - scaledRectPadHeight / 2).toString(),
            width: scaledRectPadWidth.toString(),
            height: scaledRectPadHeight.toString(),
          },
          value: "",
          children: [],
        },
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: "rgb(255, 38, 226)",
            x: (x - scaledHoleWidth / 2).toString(),
            y: (y - scaledHoleHeight / 2).toString(),
            width: scaledHoleWidth.toString(),
            height: scaledHoleHeight.toString(),
            rx: holeRadius.toString(),
            ry: holeRadius.toString(),
          },
          value: "",
          children: [],
        },
      ],
      value: "",
      attributes: {},
    })
  }

  return result
}
