import type { PcbSilkscreenText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  applyToPoint,
  compose,
  rotate,
  translate,
  scale,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const makeTextChildren = (lines: string[], fs: number): SvgObject[] =>
  lines.length === 1
    ? [
        {
          type: "text",
          value: lines[0] ?? "",
          name: "",
          attributes: {},
          children: [],
        },
      ]
    : lines.map((line, idx) => ({
        type: "element",
        name: "tspan",
        value: "",
        attributes: {
          x: "0",
          ...(idx > 0 ? { dy: fs.toString() } : {}),
        },
        children: [
          {
            type: "text",
            value: line,
            name: "",
            attributes: {},
            children: [],
          },
        ],
      }))

const approxMeasure = (lines: string[], fs: number) => {
  const maxLen = Math.max(...lines.map((s) => s.length), 1)
  const width = maxLen * 0.6 * fs // ~0.6 em/znak
  const height = fs * (lines.length <= 1 ? 1.2 : lines.length - 1 + 1.2)
  return { width, height }
}

;(globalThis as any).__KO_COUNTER__ ??= 0

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
    anchor_alignment = "center",
  } = pcbSilkscreenText as any

  if (layerFilter && layer !== layerFilter) return []

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

  let textAnchor: string = "middle"
  let dominantBaseline: string = "central"
  let dx = 0
  let dy = 0

  switch (anchor_alignment) {
    case "top_left":
      textAnchor = "start"
      dominantBaseline = "text-before-edge"
      break
    case "top_center":
      textAnchor = "middle"
      dominantBaseline = "text-before-edge"
      break
    case "top_right":
      textAnchor = "end"
      dominantBaseline = "text-before-edge"
      break
    case "center_left":
      textAnchor = "start"
      dominantBaseline = "central"
      break
    case "center_right":
      textAnchor = "end"
      dominantBaseline = "central"
      break
    case "bottom_left":
      textAnchor = "start"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_center":
      textAnchor = "middle"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_right":
      textAnchor = "end"
      dominantBaseline = "text-after-edge"
      break
    case "center":
    default:
      textAnchor = "middle"
      dominantBaseline = "central"
      break
  }

  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((ccw_rotation * Math.PI) / 180),
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const lines = (text ?? "").toString().split("\n")

  const knockout = !!(pcbSilkscreenText as any).knockout
  const paddingMm =
    (pcbSilkscreenText as any).knockout_padding ??
    (pcbSilkscreenText as any).knockoutPadding ??
    0.25
  const padPx = Math.max(0, Number(paddingMm)) * Math.abs(transform.a)

  if (!knockout) {
    const svgObject: SvgObject = {
      name: "text",
      type: "element",
      attributes: {
        x: "0",
        y: "0",
        dx: dx.toString(),
        dy: dy.toString(),
        fill: color,
        "font-family": "Arial, sans-serif",
        "font-size": transformedFontSize.toString(),
        "text-anchor": textAnchor,
        "dominant-baseline": dominantBaseline,
        transform: matrixToString(textTransform),
        class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-text-id": (pcbSilkscreenText as any)
          .pcb_component_id,

        stroke: "none",
      },
      children: makeTextChildren(lines, transformedFontSize),
      value: "",
    }
    return [svgObject]
  }

  const { width, height } = approxMeasure(lines, transformedFontSize)

  let rx = 0
  if (textAnchor === "start") rx = 0
  else if (textAnchor === "middle") rx = -width / 2
  else if (textAnchor === "end") rx = -width

  let ry = 0
  if (dominantBaseline === "text-before-edge") ry = 0
  else if (dominantBaseline === "central") ry = -height / 2
  else if (dominantBaseline === "text-after-edge") ry = -height

  const rectX = (rx - padPx).toString()
  const rectY = (ry - padPx).toString()
  const rectW = (width + 2 * padPx).toString()
  const rectH = (height + 2 * padPx).toString()

  const maskId = `pcb-silk-ko-${(++(globalThis as any).__KO_COUNTER__).toString()}`

  const group: SvgObject = {
    type: "element",
    name: "g",
    value: "",
    attributes: {
      transform: `rotate(${ccw_rotation}, ${transformedX}, ${transformedY})`,
    },
    children: [
      {
        type: "element",
        name: "defs",
        value: "",
        attributes: {},
        children: [
          {
            type: "element",
            name: "mask",
            value: "",
            attributes: { id: maskId },
            children: [
              {
                type: "element",
                name: "rect",
                value: "",
                attributes: {
                  x: rectX,
                  y: rectY,
                  width: rectW,
                  height: rectH,
                  fill: "white",
                  transform: matrixToString(
                    compose(
                      translate(transformedX, transformedY),
                      ...(layer === "bottom" ? [scale(-1, 1)] : []),
                    ),
                  ),
                },
                children: [],
              },
              {
                type: "element",
                name: "text",
                value: "",
                attributes: {
                  x: "0",
                  y: "0",
                  dx: dx.toString(),
                  dy: dy.toString(),
                  fill: "black", // izrez
                  "font-family": "Arial, sans-serif",
                  "font-size": transformedFontSize.toString(),
                  "text-anchor": textAnchor,
                  "dominant-baseline": dominantBaseline,
                  transform: matrixToString(textTransform),
                },
                children: makeTextChildren(lines, transformedFontSize),
              },
            ],
          },
        ],
      },
      {
        type: "element",
        name: "rect",
        value: "",
        attributes: {
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          fill: color,
          transform: matrixToString(
            compose(
              translate(transformedX, transformedY),
              ...(layer === "bottom" ? [scale(-1, 1)] : []),
            ),
          ),
          mask: `url(#${maskId})`,
          class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
          "data-pcb-silkscreen-text-id":
            (pcbSilkscreenText as any).pcb_component_id,
        },
        children: [],
      },
    ],
  }

  return [group]
}
