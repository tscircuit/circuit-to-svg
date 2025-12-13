import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { distance } from "circuit-json"

export interface PcbTextureBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Compute the bounds used for PCB textures.
 * - Prefers pcb_board bounds (textures are board-relative).
 * - Falls back to pcb_panel when no boards exist.
 * Throws if neither is present.
 */
export function getPcbTextureBounds(
  circuitJson: AnyCircuitElement[],
): PcbTextureBounds {
  let boardMinX = Number.POSITIVE_INFINITY
  let boardMinY = Number.POSITIVE_INFINITY
  let boardMaxX = Number.NEGATIVE_INFINITY
  let boardMaxY = Number.NEGATIVE_INFINITY
  let hasBoardBounds = false

  let panelMinX = Number.POSITIVE_INFINITY
  let panelMinY = Number.POSITIVE_INFINITY
  let panelMaxX = Number.NEGATIVE_INFINITY
  let panelMaxY = Number.NEGATIVE_INFINITY
  let hasPanelBounds = false

  for (const el of circuitJson) {
    if (el.type === "pcb_board") {
      const board = el as PcbBoard
      const centerX = distance.parse(board.center?.x)
      const centerY = distance.parse(board.center?.y)
      const width = distance.parse((board as any).width)
      const height = distance.parse((board as any).height)
      if (
        centerX === undefined ||
        centerY === undefined ||
        width === undefined ||
        height === undefined
      ) {
        continue
      }
      const halfW = width / 2
      const halfH = height / 2
      boardMinX = Math.min(boardMinX, centerX - halfW)
      boardMaxX = Math.max(boardMaxX, centerX + halfW)
      boardMinY = Math.min(boardMinY, centerY - halfH)
      boardMaxY = Math.max(boardMaxY, centerY + halfH)
      hasBoardBounds = true
    } else if (el.type === "pcb_panel") {
      const panel = el as PcbPanel
      const centerX = distance.parse(panel.center?.x ?? 0)
      const centerY = distance.parse(panel.center?.y ?? 0)
      const width = distance.parse(panel.width)
      const height = distance.parse(panel.height)
      if (
        centerX === undefined ||
        centerY === undefined ||
        width === undefined ||
        height === undefined
      ) {
        continue
      }
      const halfW = width / 2
      const halfH = height / 2
      panelMinX = Math.min(panelMinX, centerX - halfW)
      panelMaxX = Math.max(panelMaxX, centerX + halfW)
      panelMinY = Math.min(panelMinY, centerY - halfH)
      panelMaxY = Math.max(panelMaxY, centerY + halfH)
      hasPanelBounds = true
    }
  }

  if (hasBoardBounds && Number.isFinite(boardMinX)) {
    return { minX: boardMinX, maxX: boardMaxX, minY: boardMinY, maxY: boardMaxY }
  }

  if (hasPanelBounds && Number.isFinite(panelMinX)) {
    return { minX: panelMinX, maxX: panelMaxX, minY: panelMinY, maxY: panelMaxY }
  }

  throw new Error("No pcb_board or pcb_panel elements found while computing texture bounds")
}

