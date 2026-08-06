import type { PcbCopperPour } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotate,
  toString as matrixToString,
  translate,
  type Matrix,
} from "transformation-matrix"
import { ringToPathD } from "lib/utils/ring-to-path-d"

export interface CopperPourShape {
  elementType: "rect" | "polygon" | "path"
  shapeAttributes: Record<string, string>
}

/**
 * Computes the svg element type and geometry attributes for a copper pour.
 * Shared by the copper pour renderer and the trace mask that hides trace
 * portions inside same-net pours, so both always use the same geometry.
 */
export function getCopperPourShape(
  pour: PcbCopperPour,
  transform: Matrix,
): CopperPourShape | null {
  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint(transform, [pour.center.x, pour.center.y])
    const scaledWidth = pour.width * Math.abs(transform.a)
    const scaledHeight = pour.height * Math.abs(transform.d)
    const svgRotation = -(pour.rotation ?? 0)

    return {
      elementType: "rect",
      shapeAttributes: {
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        transform: matrixToString(
          compose(translate(cx, cy), rotate((svgRotation * Math.PI) / 180)),
        ),
      },
    }
  }

  if (pour.shape === "polygon") {
    if (!pour.points || pour.points.length === 0) return null

    const pointsString = pour.points
      .map((p) => applyToPoint(transform, [p.x, p.y]))
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ")

    return {
      elementType: "polygon",
      shapeAttributes: { points: pointsString },
    }
  }

  if (pour.shape === "brep") {
    const { brep_shape } = pour
    let d = ringToPathD(brep_shape.outer_ring.vertices, transform)
    for (const inner_ring of brep_shape.inner_rings ?? []) {
      d += ` ${ringToPathD(inner_ring.vertices, transform)}`
    }

    return {
      elementType: "path",
      shapeAttributes: { d, "fill-rule": "evenodd" },
    }
  }

  return null
}
