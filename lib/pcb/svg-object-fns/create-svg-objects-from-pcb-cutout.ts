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
import { HOLE_COLOR } from "../colors"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCutout(
  cutout: PcbCutout,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  if (cutout.shape === "rect") {
    const rectCutout = cutout as PcbCutoutRect
    const [cx, cy] = applyToPoint(transform, [
      rectCutout.center.x,
      rectCutout.center.y,
    ])
    const scaledWidth = rectCutout.width * Math.abs(transform.a)
    const scaledHeight = rectCutout.height * Math.abs(transform.d)
    const svgRotation = -(rectCutout.rotation ?? 0)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-cutout pcb-cutout-rect",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          fill: HOLE_COLOR,
          transform: matrixToString(
            compose(translate(cx, cy), rotate((svgRotation * Math.PI) / 180)),
          ),
        },
        children: [],
        value: "",
      },
    ]
  }
  if (cutout.shape === "circle") {
    const circleCutout = cutout as PcbCutoutCircle
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
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }
  if (cutout.shape === "polygon") {
    const polygonCutout = cutout as PcbCutoutPolygon
    if (!polygonCutout.points || polygonCutout.points.length === 0) return []

    const transformedPoints = polygonCutout.points.map((p: Point) =>
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
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }

  return []
}
