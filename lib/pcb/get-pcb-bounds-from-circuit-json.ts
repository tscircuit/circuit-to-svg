import type {
  AnyCircuitElement,
  PCBKeepoutCircle,
  PCBKeepoutRect,
  PcbCutout,
  PcbPanel,
  Point,
} from "circuit-json"
import { distance } from "circuit-json"

export interface PcbBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  boardMinX: number
  boardMinY: number
  boardMaxX: number
  boardMaxY: number
  hasBounds: boolean
  hasBoardBounds: boolean
}

export function getPcbBoundsFromCircuitJson(
  circuitJson: AnyCircuitElement[],
): PcbBounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let hasBounds = false

  // Track bounds for pcb_board specifically
  let boardMinX = Number.POSITIVE_INFINITY
  let boardMinY = Number.POSITIVE_INFINITY
  let boardMaxX = Number.NEGATIVE_INFINITY
  let boardMaxY = Number.NEGATIVE_INFINITY
  let hasBoardBounds = false

  // Process all elements to determine bounds
  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_panel") {
      const panel = circuitJsonElm as PcbPanel
      const width = distance.parse(panel.width)
      const height = distance.parse(panel.height)
      if (width === undefined || height === undefined) {
        continue
      }
      const center = panel.center ?? { x: width / 2, y: height / 2 }
      updateBounds({ center, width, height })
    } else if (circuitJsonElm.type === "pcb_board") {
      if (
        circuitJsonElm.outline &&
        Array.isArray(circuitJsonElm.outline) &&
        circuitJsonElm.outline.length >= 3
      ) {
        updateBoundsToIncludeOutline(circuitJsonElm.outline)
        updateBoardBoundsToIncludeOutline(circuitJsonElm.outline)
      } else if (
        "center" in circuitJsonElm &&
        "width" in circuitJsonElm &&
        "height" in circuitJsonElm
      ) {
        updateBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height,
        })
        updateBoardBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height,
        })
      }
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      const pad = circuitJsonElm
      if (
        pad.shape === "rect" ||
        pad.shape === "rotated_rect" ||
        pad.shape === "pill"
      ) {
        updateBounds({
          center: { x: pad.x, y: pad.y },
          width: pad.width,
          height: pad.height,
        })
      } else if (pad.shape === "circle") {
        const radius = distance.parse(pad.radius)
        if (radius !== undefined) {
          updateBounds({
            center: { x: pad.x, y: pad.y },
            width: radius * 2,
            height: radius * 2,
          })
        }
      } else if (pad.shape === "polygon") {
        updateTraceBounds(pad.points)
      }
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({
        center: { x: circuitJsonElm.x, y: circuitJsonElm.y },
        width: 0,
        height: 0,
      })
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_note_rect" ||
      circuitJsonElm.type === "pcb_fabrication_note_rect"
    ) {
      updateBounds({
        center: circuitJsonElm.center,
        width: circuitJsonElm.width,
        height: circuitJsonElm.height,
      })
    } else if (
      circuitJsonElm.type === "pcb_note_dimension" ||
      circuitJsonElm.type === "pcb_fabrication_note_dimension"
    ) {
      const dimension = circuitJsonElm
      const {
        from,
        to,
        text,
        font_size = 1,
        arrow_size,
        offset_distance,
        offset_direction,
      } = dimension
      if (!from || !to || !arrow_size) continue

      updateBounds({ center: from, width: 0, height: 0 })
      updateBounds({ center: to, width: 0, height: 0 })

      const normalize = (v: { x: number; y: number }) => {
        const l = Math.hypot(v.x, v.y) || 1
        return { x: v.x / l, y: v.y / l }
      }

      const direction = normalize({ x: to.x - from.x, y: to.y - from.y })
      if (Number.isNaN(direction.x) || Number.isNaN(direction.y)) continue

      const perpendicular = { x: -direction.y, y: direction.x }
      const hasOffsetDirection =
        offset_direction &&
        typeof offset_direction.x === "number" &&
        typeof offset_direction.y === "number"
      const normalizedOffsetDirection = hasOffsetDirection
        ? normalize(offset_direction)
        : { x: 0, y: 0 }
      const offsetMagnitude =
        typeof offset_distance === "number" ? offset_distance : 0

      const offsetVector = {
        x: normalizedOffsetDirection.x * offsetMagnitude,
        y: normalizedOffsetDirection.y * offsetMagnitude,
      }

      const fromOffset = {
        x: from.x + offsetVector.x,
        y: from.y + offsetVector.y,
      }
      const toOffset = { x: to.x + offsetVector.x, y: to.y + offsetVector.y }
      updateBounds({ center: fromOffset, width: 0, height: 0 })
      updateBounds({ center: toOffset, width: 0, height: 0 })

      const extensionDirection =
        hasOffsetDirection &&
        (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON ||
          Math.abs(normalizedOffsetDirection.y) > Number.EPSILON)
          ? normalizedOffsetDirection
          : perpendicular

      const extensionLength = offsetMagnitude + arrow_size
      const fromExtEnd = {
        x: from.x + extensionDirection.x * extensionLength,
        y: from.y + extensionDirection.y * extensionLength,
      }
      const toExtEnd = {
        x: to.x + extensionDirection.x * extensionLength,
        y: to.y + extensionDirection.y * extensionLength,
      }
      updateBounds({ center: fromExtEnd, width: 0, height: 0 })
      updateBounds({ center: toExtEnd, width: 0, height: 0 })

      // Arrow head points
      const arrowHalfWidth = arrow_size / 2
      const fromBase = {
        x: fromOffset.x + direction.x * arrow_size,
        y: fromOffset.y + direction.y * arrow_size,
      }
      const toBase = {
        x: toOffset.x - direction.x * arrow_size,
        y: toOffset.y - direction.y * arrow_size,
      }
      const fromArrowP2 = {
        x: fromBase.x + perpendicular.x * arrowHalfWidth,
        y: fromBase.y + perpendicular.y * arrowHalfWidth,
      }
      const fromArrowP3 = {
        x: fromBase.x - perpendicular.x * arrowHalfWidth,
        y: fromBase.y - perpendicular.y * arrowHalfWidth,
      }
      updateBounds({ center: fromArrowP2, width: 0, height: 0 })
      updateBounds({ center: fromArrowP3, width: 0, height: 0 })

      const toArrowP2 = {
        x: toBase.x + perpendicular.x * arrowHalfWidth,
        y: toBase.y + perpendicular.y * arrowHalfWidth,
      }
      const toArrowP3 = {
        x: toBase.x - perpendicular.x * arrowHalfWidth,
        y: toBase.y - perpendicular.y * arrowHalfWidth,
      }
      updateBounds({ center: toArrowP2, width: 0, height: 0 })
      updateBounds({ center: toArrowP3, width: 0, height: 0 })

      if (text) {
        const midPoint = {
          x: (from.x + to.x) / 2 + offsetVector.x,
          y: (from.y + to.y) / 2 + offsetVector.y,
        }
        const textOffset = arrow_size * 1.5
        const textPoint = {
          x: midPoint.x + perpendicular.x * textOffset,
          y: midPoint.y + perpendicular.y * textOffset,
        }
        const textWidth = text.length * font_size * 0.6
        const textHeight = font_size
        updateBounds({
          center: textPoint,
          width: textWidth,
          height: textHeight,
        })
      }
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds({
          center: cutout.center,
          width: cutout.width,
          height: cutout.height,
        })
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds({
            center: cutout.center,
            width: radius * 2,
            height: radius * 2,
          })
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      } else if (cutout.shape === "path") {
        const cutoutPath = cutout
        if (cutoutPath.route && Array.isArray(cutoutPath.route)) {
          updateTraceBounds(cutoutPath.route)
        }
      }
    } else if (circuitJsonElm.type === "pcb_keepout") {
      const keepout = circuitJsonElm as PCBKeepoutRect | PCBKeepoutCircle
      if (keepout.shape === "rect") {
        updateBounds({
          center: keepout.center,
          width: keepout.width,
          height: keepout.height,
        })
      } else if (keepout.shape === "circle") {
        // radius is a number, not a Distance type
        const radius =
          typeof keepout.radius === "number"
            ? keepout.radius
            : (distance.parse(keepout.radius) ?? 0)
        if (radius > 0) {
          updateBounds({
            center: keepout.center,
            width: radius * 2,
            height: radius * 2,
          })
        }
      }
    } else if (
      circuitJsonElm.type === "pcb_silkscreen_text" ||
      circuitJsonElm.type === "pcb_silkscreen_rect" ||
      circuitJsonElm.type === "pcb_silkscreen_circle" ||
      circuitJsonElm.type === "pcb_silkscreen_line" ||
      circuitJsonElm.type === "pcb_silkscreen_oval"
    ) {
      updateSilkscreenBounds(circuitJsonElm)
    } else if (circuitJsonElm.type === "pcb_copper_text") {
      updateBounds({
        center: circuitJsonElm.anchor_position,
        width: 0,
        height: 0,
      })
    } else if (circuitJsonElm.type === "pcb_copper_pour") {
      if (circuitJsonElm.shape === "rect") {
        updateBounds({
          center: circuitJsonElm.center,
          width: circuitJsonElm.width,
          height: circuitJsonElm.height,
        })
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    boardMinX,
    boardMinY,
    boardMaxX,
    boardMaxY,
    hasBounds,
    hasBoardBounds,
  }

  function updateBounds({
    center,
    width,
    height,
  }: {
    center: Point
    width?: number
    height?: number
  }) {
    if (!center) return
    const centerX = distance.parse(center.x)
    const centerY = distance.parse(center.y)
    if (centerX === undefined || centerY === undefined) return
    const numericWidth = distance.parse(width) ?? 0
    const numericHeight = distance.parse(height) ?? 0
    const halfWidth = numericWidth / 2
    const halfHeight = numericHeight / 2
    minX = Math.min(minX, centerX - halfWidth)
    minY = Math.min(minY, centerY - halfHeight)
    maxX = Math.max(maxX, centerX + halfWidth)
    maxY = Math.max(maxY, centerY + halfHeight)
    hasBounds = true
  }

  function updateBoardBounds({
    center,
    width,
    height,
  }: {
    center: Point
    width?: number
    height?: number
  }) {
    if (!center) return
    const centerX = distance.parse(center.x)
    const centerY = distance.parse(center.y)
    if (centerX === undefined || centerY === undefined) return
    const numericWidth = distance.parse(width) ?? 0
    const numericHeight = distance.parse(height) ?? 0
    const halfWidth = numericWidth / 2
    const halfHeight = numericHeight / 2
    boardMinX = Math.min(boardMinX, centerX - halfWidth)
    boardMinY = Math.min(boardMinY, centerY - halfHeight)
    boardMaxX = Math.max(boardMaxX, centerX + halfWidth)
    boardMaxY = Math.max(boardMaxY, centerY + halfHeight)
    hasBounds = true
    hasBoardBounds = true
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
    }
  }

  function updateBoardBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      boardMinX = Math.min(boardMinX, x)
      boardMinY = Math.min(boardMinY, y)
      boardMaxX = Math.max(boardMaxX, x)
      boardMaxY = Math.max(boardMaxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
      hasBoardBounds = true
    }
  }

  function updateTraceBounds(route: Point[]) {
    let updated = false
    for (const point of route) {
      const x = distance.parse(point?.x)
      const y = distance.parse(point?.y)
      if (x === undefined || y === undefined) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      updated = true
    }
    if (updated) {
      hasBounds = true
    }
  }

  function updateSilkscreenBounds(item: AnyCircuitElement) {
    if (item.type === "pcb_silkscreen_text") {
      updateBounds({ center: item.anchor_position, width: 0, height: 0 })
    } else if (item.type === "pcb_silkscreen_path") {
      updateTraceBounds(item.route)
    } else if (item.type === "pcb_silkscreen_rect") {
      updateBounds({
        center: item.center,
        width: item.width,
        height: item.height,
      })
    } else if (item.type === "pcb_silkscreen_circle") {
      const radius = distance.parse(item.radius)
      if (radius !== undefined) {
        updateBounds({
          center: item.center,
          width: radius * 2,
          height: radius * 2,
        })
      }
    } else if (item.type === "pcb_silkscreen_line") {
      updateBounds({ center: { x: item.x1, y: item.y1 }, width: 0, height: 0 })
      updateBounds({ center: { x: item.x2, y: item.y2 }, width: 0, height: 0 })
    } else if (item.type === "pcb_silkscreen_oval") {
      const radiusX = distance.parse(item.radius_x)
      const radiusY = distance.parse(item.radius_y)
      if (radiusX !== undefined && radiusY !== undefined) {
        updateBounds({
          center: item.center,
          width: radiusX * 2,
          height: radiusY * 2,
        })
      }
    } else if (item.type === "pcb_cutout") {
      const cutout = item as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds({
          center: cutout.center,
          width: cutout.width,
          height: cutout.height,
        })
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds({
            center: cutout.center,
            width: radius * 2,
            height: radius * 2,
          })
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      } else if (cutout.shape === "path") {
        const cutoutPath = cutout
        if (cutoutPath.route && Array.isArray(cutoutPath.route)) {
          updateTraceBounds(cutoutPath.route)
        }
      }
    }
  }
}
