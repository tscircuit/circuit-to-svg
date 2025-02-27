import type { PcbSilkscreenText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  rotate,
  translate,
  toString as matrixToString,
} from "transformation-matrix"

interface PcbBoundaryStyle {
  fill: string
  stroke: string
  strokeWidthFactor: number
}

const DEFAULT_PCB_BOUNDARY: PcbBoundaryStyle = {
  fill: "none",
  stroke: "#fff",
  strokeWidthFactor: 0.3,
}

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  transform: Matrix,
): SvgObject[] {
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
  } = pcbSilkscreenText

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    console.error("Invalid anchor_position:", anchor_position)
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])
  const transformedFontSize = font_size * Math.abs(transform.a)

  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((ccw_rotation * Math.PI) / 180),
  )

  const path = `M ${transformedX} ${transformedY} L ${transformedX + 10} ${transformedY + 10}`

  const svgObject: SvgObject = {
    name: "path",
    type: "element",
    attributes: {
      class: "pcb-fabrication-note-path",
      stroke: "#fff",
      fill: "none",
      d: path,
      "stroke-width": (
        DEFAULT_PCB_BOUNDARY.strokeWidthFactor * Math.abs(transform.a)
      ).toString(),
      "data-pcb-component-id": pcbSilkscreenText.pcb_component_id,
      "data-pcb-fabrication-note-path-id": pcbSilkscreenText.pcb_component_id,
    },
    value: "",
    children: [
      {
        name: "text",
        type: "element",
        attributes: {
          x: "0",
          y: "0",
          "font-family": "Arial, sans-serif",
          "font-size": transformedFontSize.toString(),
          "text-anchor": "middle",
          "dominant-baseline": "central",
          transform: matrixToString(textTransform),
          class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
          "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
        },
        children: [
          {
            type: "text",
            value: text,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      },
    ],
  }

  return [svgObject]
}
