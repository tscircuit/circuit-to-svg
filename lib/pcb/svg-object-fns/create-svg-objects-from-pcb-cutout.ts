import type {
  PcbCutout,
  PcbCutoutRect,
  PcbCutoutCircle,
  PcbCutoutPolygon,
  Point,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import {
  applyToPoint,
  compose,
  rotate,
  translate,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCutout(
  cutout: PcbCutout,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
  if (cutout.shape === "rect") {
    const rectCutout = cutout as PcbCutoutRect
    if (
      !rectCutout.center ||
      !Number.isFinite(rectCutout.center.x) ||
      !Number.isFinite(rectCutout.center.y) ||
      !Number.isFinite(rectCutout.width) ||
      !Number.isFinite(rectCutout.height) ||
      rectCutout.width <= 0 ||
      rectCutout.height <= 0
    ) {
      return []
    }
    const [cx, cy] = applyToPoint(transform, [
      rectCutout.center.x,
      rectCutout.center.y,
    ])
    const scaledWidth = rectCutout.width * Math.abs(transform.a)
    const scaledHeight = rectCutout.height * Math.abs(transform.d)
    const safeRotation = Number.isFinite(rectCutout.rotation)
      ? rectCutout.rotation!
      : 0
    const svgRotation = -safeRotation

    const { corner_radius } = rectCutout as any
    const maxCornerRadius = Math.min(rectCutout.width, rectCutout.height) / 2
    const baseCornerRadius =
      typeof corner_radius === "number" &&
      Number.isFinite(corner_radius) &&
      corner_radius > 0
        ? Math.min(corner_radius, maxCornerRadius)
        : 0
    const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a)
    const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d)

    const attributes: { [key: string]: string } = {
      class: "pcb-cutout pcb-cutout-rect",
      x: (-scaledWidth / 2).toString(),
      y: (-scaledHeight / 2).toString(),
      width: scaledWidth.toString(),
      height: scaledHeight.toString(),
      fill: colorMap.drill,
      transform: matrixToString(
        compose(translate(cx, cy), rotate((svgRotation * Math.PI) / 180)),
      ),
      "data-type": "pcb_cutout",
      "data-pcb-layer": "drill",
    }

    if (transformedCornerRadiusX > 0) {
      attributes.rx = transformedCornerRadiusX.toString()
    }

    if (transformedCornerRadiusY > 0) {
      attributes.ry = transformedCornerRadiusY.toString()
    }

    return [
      {
        name: "rect",
        type: "element",
        attributes,
        children: [],
        value: "",
      },
    ]
  }
  if (cutout.shape === "circle") {
    const circleCutout = cutout as PcbCutoutCircle
    if (
      !circleCutout.center ||
      !Number.isFinite(circleCutout.center.x) ||
      !Number.isFinite(circleCutout.center.y) ||
      !Number.isFinite(circleCutout.radius) ||
      circleCutout.radius <= 0
    ) {
      return []
    }
    const [cx, cy] = applyToPoint(transform, [
      circleCutout.center.x,
      circleCutout.center.y,
    ])
    const scaledRadius = circleCutout.radius * Math.abs(transform.a)

    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-cutout pcb-cutout-circle",
          cx: cx.toString(),
          cy: cy.toString(),
          r: scaledRadius.toString(),
          fill: colorMap.drill,
          "data-type": "pcb_cutout",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      },
    ]
  }
  if (cutout.shape === "polygon") {
    const polygonCutout = cutout as PcbCutoutPolygon
    if (!polygonCutout.points || !Array.isArray(polygonCutout.points)) return []
    const validPoints = polygonCutout.points.filter(
      (p: Point) => Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y),
    )
    if (validPoints.length < 3) return []

    const transformedPoints = validPoints.map((p: Point) =>
      applyToPoint(transform, [p.x, p.y]),
    )
    const pointsString = transformedPoints
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ")

    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "pcb-cutout pcb-cutout-polygon",
          points: pointsString,
          fill: colorMap.drill,
          "data-type": "pcb_cutout",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      },
    ]
  }

  return []
}
