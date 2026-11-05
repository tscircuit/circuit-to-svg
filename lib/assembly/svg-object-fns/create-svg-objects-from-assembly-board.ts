import type { AnyCircuitElement, PCBBoard, Point } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

interface BoardStyle {
  fill: string
  stroke: string
  strokeOpacity: string
  strokeWidthFactor: number
}

const DEFAULT_BOARD_STYLE: BoardStyle = {
  fill: "none",
  stroke: "rgb(0,0,0)",
  strokeOpacity: "0.8",
  strokeWidthFactor: 0.2,
}

export function createSvgObjectsFromAssemblyBoard(
  pcbBoard: PCBBoard,
  transform: Matrix,
  style: Partial<BoardStyle> = {},
  soup: AnyCircuitElement[] = [],
): SvgObject[] {
  const { width, height, center, outline } = pcbBoard

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

  const cutouts = su(soup).pcb_cutout.list()
  for (const cutout of cutouts) {
    if (cutout.shape === "rect") {
      const cx = cutout.center?.x ?? 0
      const cy = cutout.center?.y ?? 0
      const halfWidth = (cutout.width ?? 0) / 2
      const halfHeight = (cutout.height ?? 0) / 2
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
          cx + lx * cos - ly * sin,
          cy + lx * sin + ly * cos,
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

  return [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-board",
        d: path,
        fill: style.fill ?? DEFAULT_BOARD_STYLE.fill,
        stroke: style.stroke ?? DEFAULT_BOARD_STYLE.stroke,
        "stroke-opacity":
          style.strokeOpacity ?? DEFAULT_BOARD_STYLE.strokeOpacity,
        "stroke-width": (
          (style.strokeWidthFactor ?? DEFAULT_BOARD_STYLE.strokeWidthFactor) *
          Math.abs(transform.a)
        ).toString(),
      },
    },
  ]
}
