import Flatten from "@flatten-js/core"
import type { PcbCopperPour, PCBTrace, PcbSmtPad } from "circuit-json"
import { pairs } from "lib/utils/pairs"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const { Segment, point: flattenPoint } = Flatten

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const segments = pairs(trace.route)
  const svgObjects: SvgObject[] = []
  const uncoveredRegions = showSolderMask
    ? [...getUncoveredPadPolygons(ctx), ...getUncoveredCopperPourPolygons(ctx)]
    : []

  for (const [start, end] of segments) {
    const startPoint = applyToPoint(transform, [start.x, start.y])
    const endPoint = applyToPoint(transform, [end.x, end.y])

    const layer =
      "layer" in start ? start.layer : "layer" in end ? end.layer : null
    if (!layer) continue
    if (layerFilter && layer !== layerFilter) continue

    const copperColor = layerNameToColor(layer, colorMap)
    const maskColor =
      colorMap.soldermask[layer as keyof typeof colorMap.soldermask] ??
      copperColor
    const maskStroke = lightenColor(maskColor)

    const traceWidth =
      "width" in start ? start.width : "width" in end ? end.width : null

    const numericWidth = traceWidth ? traceWidth * Math.abs(transform.a) : 0.3
    const width = numericWidth.toString()

    let clippedPath = `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`
    let maskPath: string | null = null

    if (showSolderMask) {
      const segment = new Segment(
        flattenPoint(startPoint[0], startPoint[1]),
        flattenPoint(endPoint[0], endPoint[1]),
      )
      const maskIntervals = computeMaskIntervals(segment, uncoveredRegions)
      maskPath = intervalsToPath(startPoint, endPoint, maskIntervals)
      clippedPath = maskPath || ""
    }

    if (clippedPath) {
      const copperObject: SvgObject = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace",
          stroke: copperColor,
          fill: "none",
          d: clippedPath,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
          "data-type": "pcb_trace",
          "data-pcb-layer": layer,
        },
      }
      svgObjects.push(copperObject)
    }

    if (showSolderMask && maskPath) {
      const maskObject: SvgObject = {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-soldermask",
          stroke: maskStroke,
          fill: "none",
          d: maskPath,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "shape-rendering": "crispEdges",
          "data-type": "pcb_soldermask",
          "data-pcb-layer": layer,
        },
      }
      svgObjects.push(maskObject)
    }
  }

  return svgObjects
}

function lightenColor(color: string): string {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10) + 60)
    const g = Math.min(255, parseInt(rgbMatch[2], 10) + 80)
    const b = Math.min(255, parseInt(rgbMatch[3], 10) + 40)
    return `rgb(${r}, ${g}, ${b})`
  }
  return "rgb(78, 162, 90)"
}

function getUncoveredPadPolygons(ctx: PcbContext): Flatten.Polygon[] {
  const pads =
    ctx.circuitJson?.filter(
      (elm) =>
        elm.type === "pcb_smtpad" &&
        (elm as PcbSmtPad).is_covered_with_solder_mask === false,
    ) ?? []

  return pads
    .map((pad) => createPadPolygon(pad as PcbSmtPad, ctx))
    .filter((poly): poly is Flatten.Polygon => poly !== null)
}

function getUncoveredCopperPourPolygons(ctx: PcbContext): Flatten.Polygon[] {
  const pours =
    ctx.circuitJson?.filter(
      (elm) =>
        elm.type === "pcb_copper_pour" &&
        (elm as PcbCopperPour).covered_with_solder_mask === false,
    ) ?? []

  return pours
    .map((pour) => createCopperPourPolygon(pour as PcbCopperPour, ctx))
    .filter((poly): poly is Flatten.Polygon => poly !== null)
}

function createPadPolygon(
  pad: PcbSmtPad,
  ctx: PcbContext,
): Flatten.Polygon | null {
  const { transform } = ctx

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const [cx, cy] = applyToPoint(transform, [pad.x, pad.y])
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)

    let points: [number, number][]
    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      const angle = (pad.ccw_rotation * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const corners: Array<[number, number]> = [
        [-width / 2, -height / 2],
        [width / 2, -height / 2],
        [width / 2, height / 2],
        [-width / 2, height / 2],
      ]
      points = corners.map(([x, y]) => {
        const rx = x * cos - y * sin
        const ry = x * sin + y * cos
        return [cx + rx, cy + ry]
      })
    } else {
      points = [
        [cx - width / 2, cy - height / 2],
        [cx + width / 2, cy - height / 2],
        [cx + width / 2, cy + height / 2],
        [cx - width / 2, cy + height / 2],
      ]
    }

    return new Flatten.Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  }

  if (pad.shape === "pill") {
    const [cx, cy] = applyToPoint(transform, [pad.x, pad.y])
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const segments = 32
    const points: [number, number][] = []
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const px = cx + (width / 2 - radius) * Math.cos(angle)
      const py = cy + (height / 2 - radius) * Math.sin(angle)
      points.push([px, py])
    }
    return new Flatten.Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  }

  if (pad.shape === "circle") {
    const [cx, cy] = applyToPoint(transform, [pad.x, pad.y])
    const radius = pad.radius * Math.abs(transform.a)
    const segments = 32
    const points: [number, number][] = []
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      points.push([
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ])
    }
    return new Flatten.Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  }

  if (pad.shape === "polygon" && pad.points) {
    const points = pad.points.map((p) => {
      const [x, y] = applyToPoint(transform, [p.x, p.y])
      return [x, y] as [number, number]
    })
    return new Flatten.Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  }

  return null
}

function createCopperPourPolygon(
  pour: PcbCopperPour,
  ctx: PcbContext,
): Flatten.Polygon | null {
  const { transform } = ctx

  if (pour.shape === "rect") {
    const center = pour.center ?? { x: 0, y: 0 }
    const width = pour.width ?? 0
    const height = pour.height ?? 0
    const angle = ((pour.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const localCorners: Array<[number, number]> = [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ]

    const worldPoints = localCorners.map(([x, y]) => {
      const rx = x * cos - y * sin
      const ry = x * sin + y * cos
      return applyToPoint(transform, [center.x + rx, center.y + ry]) as [
        number,
        number,
      ]
    })

    return new Flatten.Polygon(worldPoints.map(([x, y]) => flattenPoint(x, y)))
  }

  if (pour.shape === "polygon" && pour.points) {
    const points = pour.points.map((p) =>
      applyToPoint(transform, [p.x, p.y]),
    ) as [number, number][]

    return new Flatten.Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  }

  return null
}

type Interval = { start: number; end: number }

function computeMaskIntervals(
  segment: Flatten.Segment,
  padPolygons: Flatten.Polygon[],
): Interval[] {
  let intervals: Interval[] = [{ start: 0, end: 1 }]

  for (const pad of padPolygons) {
    const intersections = pad.intersect(segment) as Flatten.Point[]
    const params = intersections
      .map((pt) => getSegmentParameter(segment, pt))
      .filter((t) => t >= 0 && t <= 1)

    const startInside = pad.contains(segment.start)
    const endInside = pad.contains(segment.end)

    if (startInside) params.push(0)
    if (endInside) params.push(1)

    if (params.length === 0 && !startInside && !endInside) continue

    const sorted = Array.from(new Set(params)).sort((a, b) => a - b)

    let inside = startInside
    let previous = 0

    for (const t of sorted) {
      if (inside) intervals = subtractInterval(intervals, previous, t)
      previous = t
      inside = !inside
    }

    if (inside) intervals = subtractInterval(intervals, previous, 1)
  }

  return intervals
}

function getSegmentParameter(
  segment: Flatten.Segment,
  pt: Flatten.Point,
): number {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y

  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return (pt.x - segment.start.x) / dx
  }

  if (dy !== 0) {
    return (pt.y - segment.start.y) / dy
  }

  return 0
}

function subtractInterval(
  intervals: Interval[],
  removeStart: number,
  removeEnd: number,
): Interval[] {
  const start = Math.max(0, Math.min(1, removeStart))
  const end = Math.max(0, Math.min(1, removeEnd))
  if (end <= start) return intervals

  const result: Interval[] = []

  for (const interval of intervals) {
    if (end <= interval.start || start >= interval.end) {
      result.push(interval)
      continue
    }

    if (start > interval.start) {
      result.push({ start: interval.start, end: start })
    }

    if (end < interval.end) {
      result.push({ start: end, end: interval.end })
    }
  }

  return result
}

function intervalsToPath(
  startPoint: [number, number],
  endPoint: [number, number],
  intervals: Interval[],
): string {
  if (intervals.length === 0) return ""

  const [sx, sy] = startPoint
  const dx = endPoint[0] - sx
  const dy = endPoint[1] - sy

  const commands: string[] = []
  for (const interval of intervals) {
    if (interval.end <= interval.start) continue
    const startX = sx + dx * interval.start
    const startY = sy + dy * interval.start
    const endX = sx + dx * interval.end
    const endY = sy + dy * interval.end
    commands.push(`M ${startX} ${startY} L ${endX} ${endY}`)
  }

  return commands.join(" ")
}
