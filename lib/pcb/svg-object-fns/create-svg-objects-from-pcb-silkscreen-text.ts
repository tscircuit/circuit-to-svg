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

interface BoundaryStyle {
  fill: string
  stroke: string
  strokeWidthFactor: number
}

const DEFAULT_BOUNDARY: BoundaryStyle = {
  fill: "none",
  stroke: "#fff",
  strokeWidthFactor: 0.3,
}

interface Options {
  width?: number
  height?: number
  shouldDrawErrors?: boolean
  shouldDrawRatsNest?: boolean
}

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  transform: Matrix,
  options: Options = {}
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

  const svgWidth = options?.width ?? 800
  const svgHeight = options?.height ?? 600
  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      fill: "#000",
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
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
