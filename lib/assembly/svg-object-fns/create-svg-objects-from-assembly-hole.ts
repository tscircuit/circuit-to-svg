import type { PCBHole } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { AssemblySvgContext } from "../convert-circuit-json-to-assembly-svg"

const HOLE_COLOR = "rgb(190, 190, 190)" // Darker gray for holes

export function createSvgObjectsFromAssemblyHole(
  hole: PCBHole,
  ctx: AssemblySvgContext,
): SvgObject[] {
  const { transform } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a)
    const radius = scaledDiameter / 2

    if (hole.hole_shape === "circle") {
      return [
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "assembly-hole",
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            fill: HOLE_COLOR,
          },
          children: [],
          value: "",
        },
      ]
    }
    // Square hole
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-hole",
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)
    const rx = scaledWidth / 2
    const ry = scaledHeight / 2

    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "assembly-hole",
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }
  if (hole.hole_shape === "rect") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-hole",
          x: (x - scaledWidth / 2).toString(),
          y: (y - scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }
  if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const isRotated = hole.hole_shape === "rotated_pill"
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)
    const rotation = "ccw_rotation" in hole ? (hole.ccw_rotation ?? 0) : 0
    const isHorizontal = scaledWidth > scaledHeight
    const radius = Math.min(scaledWidth, scaledHeight) / 2
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth,
    )
    const originX = isRotated ? 0 : x
    const originY = isRotated ? 0 : y

    const pathD = isHorizontal
      ? `M${originX - straightLength / 2},${originY - radius} ` +
        `h${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
        `h-${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
      : `M${originX - radius},${originY - straightLength / 2} ` +
        `v${straightLength} ` +
        `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
        `v-${straightLength} ` +
        `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`

    return [
      {
        name: "path",
        type: "element",
        attributes: {
          class: "assembly-hole",
          fill: HOLE_COLOR,
          d: pathD,
          ...(isRotated
            ? { transform: `translate(${x} ${y}) rotate(${-rotation})` }
            : {}),
        },
        children: [],
        value: "",
      },
    ]
  }
  return []
}
