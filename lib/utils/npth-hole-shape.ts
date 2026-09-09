import type { PCBHole } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

function stadiumPathD(
  x: number,
  y: number,
  scaledWidth: number,
  scaledHeight: number,
): string {
  const isHorizontal = scaledWidth > scaledHeight
  const radius = Math.min(scaledWidth, scaledHeight) / 2
  const straightLength = Math.abs(
    isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth,
  )

  if (isHorizontal) {
    return (
      `M${x - straightLength / 2},${y - radius} ` +
      `h${straightLength} ` +
      `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
      `h-${straightLength} ` +
      `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
    )
  }

  return (
    `M${x - radius},${y - straightLength / 2} ` +
    `v${straightLength} ` +
    `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
    `v-${straightLength} ` +
    `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`
  )
}

/** NPTH shapes the PCB SVG already draws but pinout/assembly previously dropped. */
export function createSvgObjectFromExtendedNpthHole(
  hole: PCBHole,
  x: number,
  y: number,
  scale: number,
  className: string,
  fill: string,
): SvgObject | null {
  if (hole.hole_shape === "rect") {
    const scaledWidth = hole.hole_width * scale
    const scaledHeight = hole.hole_height * scale
    return {
      name: "rect",
      type: "element",
      attributes: {
        class: className,
        x: (x - scaledWidth / 2).toString(),
        y: (y - scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill,
      },
      children: [],
      value: "",
    }
  }

  if (hole.hole_shape === "pill") {
    const scaledWidth = hole.hole_width * scale
    const scaledHeight = hole.hole_height * scale
    return {
      name: "path",
      type: "element",
      attributes: {
        class: className,
        fill,
        d: stadiumPathD(x, y, scaledWidth, scaledHeight),
      },
      children: [],
      value: "",
    }
  }

  if (hole.hole_shape === "rotated_pill") {
    const scaledWidth = hole.hole_width * scale
    const scaledHeight = hole.hole_height * scale
    const rotation = "ccw_rotation" in hole ? (hole.ccw_rotation ?? 0) : 0
    return {
      name: "path",
      type: "element",
      attributes: {
        class: className,
        fill,
        d: stadiumPathD(0, 0, scaledWidth, scaledHeight),
        transform: `translate(${x} ${y}) rotate(${-rotation})`,
      },
      children: [],
      value: "",
    }
  }

  return null
}
