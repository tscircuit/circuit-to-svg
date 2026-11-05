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
      const rad = ((cutout.rotation ?? 0) * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const localCorners: [number, number][] = [
        [-halfWidth, -halfHeight],
        [halfWidth, -halfHeight],
        [halfWidth, halfHeight],
        [-halfWidth, halfHeight],
      ]
      const [tl, tr, br, bl] = localCorners.map(([lx, ly]) =>
        applyToPoint(transform, [
          x + lx * cos - ly * sin,
          y + lx * sin + ly * cos,
        ]),
      ) as [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ]
      path += ` M ${tl[0]} ${tl[1]} L ${tr[0]} ${tr[1]} L ${br[0]} ${br[1]} L ${bl[0]} ${bl[1]} Z`
    } else if (cutout.shape === "circle") {
      const [cx, cy] = applyToPoint(transform, [
        cutout.center.x,
        cutout.center.y,
      ])
      const r = cutout.radius * Math.abs(transform.a)
      if (r > 0) {
        path += ` M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
      }
    } else if (
      cutout.shape === "polygon" &&
      Array.isArray(cutout.points) &&
      cutout.points.length >= 3
    ) {
      const subPath = cutout.points
        .map((point: Point, index: number) => {
          const [px, py] = applyToPoint(transform, [point.x, point.y])
          return index === 0 ? `M ${px} ${py}` : `L ${px} ${py}`
        })
        .join(" ")
      path += ` ${subPath} Z`
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
