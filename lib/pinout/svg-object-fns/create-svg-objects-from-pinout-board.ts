import type {
  AnyCircuitElement,
  PCBBoard,
  Point,
  SourceBoard,
} from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { su } from "@tscircuit/circuit-json-util"
import type { PinoutSvgContext } from "../convert-circuit-json-to-pinout-svg"

interface BoardStyle {
  fill: string
  stroke: string
  strokeOpacity: string
  strokeWidthFactor: number
}

const BOARD_FILL_COLOR = "rgb(26, 115, 143)" // Nice blue/teal color
const BOARD_STROKE_COLOR = "rgba(0,0,0,0.9)"

export function createSvgObjectsFromPinoutBoard(
  pcbBoard: PCBBoard,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const { transform, soup } = ctx
  const { width, height, center, outline } = pcbBoard

  const sourceBoard = soup.find(
    (elm) => elm.type === "source_board" && (elm as any).title,
  ) as SourceBoard
  const title = sourceBoard?.title

  let path: string
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline
      .map((point: Point, index: number) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
  } else {
    const halfWidth = width! / 2
    const halfHeight = height! / 2

    const topLeft = applyToPoint(transform, [
      center.x - halfWidth,
      center.y - halfHeight,
    ])
    const topRight = applyToPoint(transform, [
      center.x + halfWidth,
      center.y - halfHeight,
    ])
    const bottomRight = applyToPoint(transform, [
      center.x + halfWidth,
      center.y + halfHeight,
    ])
    const bottomLeft = applyToPoint(transform, [
      center.x - halfWidth,
      center.y + halfHeight,
    ])

    path =
      `M ${topLeft[0]} ${topLeft[1]} ` +
      `L ${topRight[0]} ${topRight[1]} ` +
      `L ${bottomRight[0]} ${bottomRight[1]} ` +
      `L ${bottomLeft[0]} ${bottomLeft[1]}`
  }

  path += " Z"

  const cutlery = su(soup).pcb_cutout.list()
  for (const cutout of cutlery) {
    if (cutout.shape === "rect") {
      const { x, y, width, height } = cutout.center
        ? (() => {
            const { x, y } = cutout.center
            const { width, height } = cutout
            return { x, y, width, height }
          })()
        : { x: 0, y: 0, width: 0, height: 0 }

      const halfWidth = width / 2
      const halfHeight = height / 2
      const [tl, tr, br, bl] = [
        applyToPoint(transform, [x - halfWidth, y - halfHeight]),
        applyToPoint(transform, [x + halfWidth, y - halfHeight]),
        applyToPoint(transform, [x + halfWidth, y + halfHeight]),
        applyToPoint(transform, [x - halfWidth, y + halfHeight]),
      ]
      path += ` M ${tl[0]} ${tl[1]} L ${tr[0]} ${tr[1]} L ${br[0]} ${br[1]} L ${bl[0]} ${bl[1]} Z`
    } else if (cutout.shape === "circle") {
      // svg subtract circle from path is hard, skip for now
    }
  }

  const svgObjects: SvgObject[] = [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pinout-board",
        d: path,
        fill: BOARD_FILL_COLOR,
        stroke: BOARD_STROKE_COLOR,
        "fill-rule": "evenodd",
        "stroke-opacity": "0.8",
        "stroke-width": (0.2 * Math.abs(transform.a)).toString(),
      },
    },
  ]

  if (title) {
    // Position title at the top center of the SVG
    const titleX = ctx.svgWidth / 2
    const titleY = 30 // 30px from the top

    svgObjects.push({
      name: "text",
      type: "element",
      value: "",
      children: [
        { name: "", type: "text", value: title, attributes: {}, children: [] },
      ],
      attributes: {
        x: titleX.toString(),
        y: titleY.toString(),
        "text-anchor": "middle",
        "font-size": "18px",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: "black",
        class: "pinout-board-title",
      },
    })
  }

  return svgObjects
}
