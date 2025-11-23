import type { AnyCircuitElement, PCBBoard, PcbCopperPour } from "circuit-json"
import Flatten from "@flatten-js/core"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { applyToPoint } from "transformation-matrix"

const { Polygon, BooleanOperations, point: flattenPoint } = Flatten

/**
 * Creates soldermask layers for copper pours using boolean operations
 * - Covered copper pours: brighter green (soldermask over copper)
 * - Uncovered copper pours: excluded from soldermask (will show as red copper)
 */
export function createSvgObjectsForSoldermaskCopperPours(
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  if (!ctx.showSolderMask) return []

  const currentLayer = ctx.layer || "top"
  const soldermaskColor =
    currentLayer === "bottom"
      ? ctx.colorMap.soldermask.bottom
      : ctx.colorMap.soldermask.top

  // Create a brighter green for soldermask over copper
  // Parse the dark green and make it brighter
  const brighterGreen = lightenColor(soldermaskColor)

  // Find the board
  const board = circuitJson.find((elm) => elm.type === "pcb_board") as
    | PCBBoard
    | undefined
  if (!board) return []

  // Create board polygon
  const boardPolygon = createBoardPolygon(board, ctx)
  if (!boardPolygon) return []

  // Collect copper pours only (SMT pads are handled separately)
  const coveredPours: PcbCopperPour[] = []
  const uncoveredPours: PcbCopperPour[] = []

  for (const elm of circuitJson) {
    if (elm.type === "pcb_copper_pour") {
      const pour = elm as PcbCopperPour
      if (pour.layer !== currentLayer) continue

      if (pour.covered_with_solder_mask === true) {
        coveredPours.push(pour)
      } else if (pour.covered_with_solder_mask === false) {
        uncoveredPours.push(pour)
      }
    }
  }

  const objects: SvgObject[] = []

  // Create soldermask layer, subtracting uncovered copper pours
  let maskPolygon = boardPolygon

  for (const pour of uncoveredPours) {
    const pourPolygon = createCopperPourPolygon(pour, ctx)
    if (pourPolygon) {
      try {
        maskPolygon = BooleanOperations.subtract(maskPolygon, pourPolygon)
      } catch (e) {
        console.warn("Failed to subtract uncovered copper pour:", e)
      }
    }
  }

  // Add soldermask layer (excluding uncovered pours)
  // Use darker green color for better contrast with covered copper pours
  const darkerGreen = darkenColor(soldermaskColor)
  if (!maskPolygon.isEmpty()) {
    objects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask",
        d: polygonToPathD(maskPolygon),
        fill: darkerGreen,
        "fill-opacity": "0.85",
        "data-type": "pcb_soldermask",
        "data-pcb-layer": `${currentLayer}-soldermask`,
      },
    })
  }

  // Create brighter green layer for covered copper pours
  for (const pour of coveredPours) {
    const pourPolygon = createCopperPourPolygon(pour, ctx)
    if (pourPolygon) {
      try {
        const coveredArea = BooleanOperations.intersect(
          boardPolygon,
          pourPolygon,
        )
        if (!coveredArea.isEmpty()) {
          objects.push({
            name: "path",
            type: "element",
            value: "",
            children: [],
            attributes: {
              class: "pcb-soldermask-over-copper",
              d: polygonToPathD(coveredArea),
              fill: brighterGreen,
              "fill-opacity": "0.9",
              "data-type": "pcb_soldermask_over_copper",
              "data-pcb-layer": `${currentLayer}-soldermask`,
            },
          })
        }
      } catch (e) {
        console.warn("Failed to create soldermask over copper pour:", e)
      }
    }
  }

  return objects
}

function createBoardPolygon(
  board: PCBBoard,
  ctx: PcbContext,
): Flatten.Polygon | null {
  const { transform } = ctx
  const { width, height, center, outline } = board

  let points: [number, number][]

  if (outline && Array.isArray(outline) && outline.length >= 3) {
    points = outline.map((point) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y])
      return [x, y] as [number, number]
    })
  } else if (
    width &&
    height &&
    center.x !== undefined &&
    center.y !== undefined
  ) {
    const halfWidth = width / 2
    const halfHeight = height / 2

    const corners = [
      [center.x - halfWidth, center.y - halfHeight],
      [center.x + halfWidth, center.y - halfHeight],
      [center.x + halfWidth, center.y + halfHeight],
      [center.x - halfWidth, center.y + halfHeight],
    ]

    points = corners.map((corner) => {
      const [x, y] = corner
      if (x === undefined || y === undefined) {
        throw new Error("Invalid corner coordinates")
      }
      const result = applyToPoint(transform, [x, y]) as [number, number]
      return [result[0], result[1]] as [number, number]
    })
  } else {
    return null
  }

  try {
    return new Polygon(points.map(([x, y]) => flattenPoint(x, y)))
  } catch (e) {
    console.warn("Failed to create board polygon:", e)
    return null
  }
}

function createCopperPourPolygon(
  pour: PcbCopperPour,
  ctx: PcbContext,
): Flatten.Polygon | null {
  const { transform } = ctx

  try {
    if (pour.shape === "rect") {
      const [cx, cy] = applyToPoint(transform, [pour.center.x, pour.center.y])
      const width = pour.width * Math.abs(transform.a)
      const height = pour.height * Math.abs(transform.d)

      const points: [number, number][] = [
        [cx - width / 2, cy - height / 2],
        [cx + width / 2, cy - height / 2],
        [cx + width / 2, cy + height / 2],
        [cx - width / 2, cy + height / 2],
      ]

      return new Polygon(points.map(([x, y]) => flattenPoint(x, y)))
    }

    if (pour.shape === "polygon" && pour.points) {
      const points = pour.points.map((p) => {
        const [x, y] = applyToPoint(transform, [p.x, p.y])
        return [x, y] as [number, number]
      })
      return new Polygon(points.map(([x, y]) => flattenPoint(x, y)))
    }

    // brep shapes are complex, skip for now
  } catch (e) {
    console.warn("Failed to create copper pour polygon:", e)
  }

  return null
}

function polygonToPathD(polygon: Flatten.Polygon): string {
  const paths: string[] = []

  for (const face of polygon.faces) {
    const edgePoints: string[] = []
    let isFirst = true

    for (const edge of face.edges) {
      if (isFirst) {
        edgePoints.push(`M ${edge.start.x} ${edge.start.y}`)
        isFirst = false
      }
      edgePoints.push(`L ${edge.end.x} ${edge.end.y}`)
    }

    edgePoints.push("Z")
    paths.push(edgePoints.join(" "))
  }

  return paths.join(" ")
}

function lightenColor(color: string): string {
  // Parse rgb(r, g, b) format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10) + 60)
    const g = Math.min(255, parseInt(rgbMatch[2], 10) + 80)
    const b = Math.min(255, parseInt(rgbMatch[3], 10) + 40)
    return `rgb(${r}, ${g}, ${b})`
  }
  // If parsing fails, return a brighter green
  return "rgb(78, 162, 90)"
}

function darkenColor(color: string): string {
  // Parse rgb(r, g, b) format and make it darker
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Math.max(0, parseInt(rgbMatch[1], 10) - 8)
    const g = Math.max(0, parseInt(rgbMatch[2], 10) - 32)
    const b = Math.max(0, parseInt(rgbMatch[3], 10) - 20)
    return `rgb(${r}, ${g}, ${b})`
  }
  // If parsing fails, return a darker green
  return "rgb(10, 50, 30)"
}
