import type { PCBHole } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbHole(
  hole: PCBHole,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
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
            class: "pcb-hole",
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            fill: colorMap.drill,
            "data-type": "pcb_hole",
            "data-pcb-layer": "drill",
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
          class: "pcb-hole",
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          fill: colorMap.drill,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill",
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
          class: "pcb-hole",
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          fill: colorMap.drill,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      },
    ]
  }

  if (hole.hole_shape === "pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    // Pill shape: two semicircles connected by straight lines
    // If width > height, it's a horizontal pill; if height > width, it's vertical
    const isHorizontal = scaledWidth > scaledHeight
    const radius = Math.min(scaledWidth, scaledHeight) / 2
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth,
    )

    const pathD = isHorizontal
      ? // Horizontal pill (wider than tall)
        `M${x - straightLength / 2},${y - radius} ` +
        `h${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
        `h-${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
      : // Vertical pill (taller than wide)
        `M${x - radius},${y - straightLength / 2} ` +
        `v${straightLength} ` +
        `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
        `v-${straightLength} ` +
        `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`

    return [
      {
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-hole",
          fill: colorMap.drill,
          d: pathD,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      },
    ]
  }

  if (hole.hole_shape === "rotated_pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    const radiusX = scaledWidth / 2
    const straightLength = scaledHeight - scaledWidth
    // PcbHoleRotatedPill uses ccw_rotation (not hole_ccw_rotation like plated holes)
    const rotation = "ccw_rotation" in hole ? (hole.ccw_rotation ?? 0) : 0

    return [
      {
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-hole",
          fill: colorMap.drill,
          d:
            `M${-radiusX},${-straightLength / 2} ` +
            `v${straightLength} ` +
            `a${radiusX},${radiusX} 0 0 0 ${scaledWidth},0 ` +
            `v-${straightLength} ` +
            `a${radiusX},${radiusX} 0 0 0 -${scaledWidth},0 z`,
          transform: `translate(${x} ${y}) rotate(${-rotation})`,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      },
    ]
  }

  return []
}
