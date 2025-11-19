import type { PcbCutoutPath, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCutoutPath(
  cutout: PcbCutoutPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx

  if (!cutout.route || cutout.route.length < 2) return []

  const scale = Math.abs(transform.a) || 1
  const slotWidth = cutout.slot_width * scale

  const slotLength = cutout.slot_length ? cutout.slot_length * scale : undefined

  const spacing = cutout.space_between_slots
    ? cutout.space_between_slots * scale
    : undefined

  const hasDashed = slotLength !== undefined && spacing !== undefined
  const cornerRadius = cutout.slot_corner_radius
    ? cutout.slot_corner_radius * scale
    : 0

  const linecap = cornerRadius > 0 ? "round" : "butt"
  const linejoin = cornerRadius > 0 ? "round" : "miter"

  const pts: number[][] = cutout.route.map((p: Point) =>
    applyToPoint(transform, [p.x, p.y]),
  ) as number[][]

  const segLengths: number[] = []
  const cumulative: number[] = [0]
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1]![0]! - pts[i]![0]!
    const dy = pts[i + 1]![1]! - pts[i]![1]!
    const d = Math.sqrt(dx * dx + dy * dy)
    segLengths.push(d)
    total += d
    cumulative.push(total)
  }

  const svgObjects: SvgObject[] = []

  function pointAt(distance: number): number[] {
    if (distance <= 0) return pts[0]!
    if (distance >= total) return pts[pts.length - 1]!

    let acc = 0
    for (let i = 0; i < segLengths.length; i++) {
      const seg = segLengths[i]!
      if (acc + seg >= distance) {
        const t = (distance - acc) / seg
        const p0 = pts[i]!
        const p1 = pts[i + 1]!
        return [p0[0]! + (p1[0]! - p0[0]!) * t, p0[1]! + (p1[1]! - p0[1]!) * t]
      }
      acc += seg
    }

    return pts[pts.length - 1]!
  }

  function cornersBetween(start: number, end: number): number[] {
    const out: number[] = []
    for (let i = 1; i < cumulative.length - 1; i++) {
      const d = cumulative[i]!
      if (d > start && d < end) out.push(d)
    }
    return out
  }

  function emitSlotPath(distStart: number, distEnd: number) {
    let s = distStart
    let e = distEnd

    if (linecap === "round") {
      const half = slotWidth / 2
      s = Math.max(0, s + half)
      e = Math.min(total, e - half)
      if (e <= s) return
    }

    const cs = cornersBetween(s, e)
    const distances = [s, ...cs, e]

    const p0 = pointAt(distances[0]!)
    let d = `M${p0[0]},${p0[1]}`

    for (let i = 1; i < distances.length; i++) {
      const p = pointAt(distances[i]!)
      d += ` L${p[0]},${p[1]}`
    }

    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path-slot",
        d,
        stroke: colorMap.drill,
        "stroke-width": slotWidth.toString(),
        "stroke-linecap": linecap,
        "stroke-linejoin": linejoin,
        fill: "none",
        "data-type": "pcb_cutout",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    })
  }

  if (!hasDashed) {
    let d = `M${pts[0]![0]},${pts[0]![1]}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L${pts[i]![0]},${pts[i]![1]}`
    }

    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path-segment",
        d,
        stroke: colorMap.drill,
        "stroke-width": slotWidth.toString(),
        "stroke-linecap": linecap,
        "stroke-linejoin": linejoin,
        fill: "none",
        "data-type": "pcb_cutout",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    })

    return svgObjects
  }

  const slotLen = slotLength!
  const gap = spacing!
  const pitch = slotLen + gap

  for (let d = 0; d < total; d += pitch) {
    const s = d
    const e = Math.min(d + slotLen, total)
    emitSlotPath(s, e)
  }

  return svgObjects
}
