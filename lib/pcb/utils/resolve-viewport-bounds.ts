import type { AnyCircuitElement, PcbBoard, PcbPanel, Point } from "circuit-json"
import { distance } from "circuit-json"

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

interface BaseBounds extends Bounds {
  boardMinX: number
  boardMinY: number
  boardMaxX: number
  boardMaxY: number
  hasBoardBounds: boolean
}

interface ViewportOptions {
  viewport?: Bounds
  viewportTarget?: {
    pcb_panel_id?: string
    pcb_board_id?: string
  }
}

export const resolveViewportBounds = ({
  circuitJson,
  drawPaddingOutsideBoard,
  baseBounds,
  viewportOptions,
}: {
  circuitJson: AnyCircuitElement[]
  drawPaddingOutsideBoard: boolean
  baseBounds: BaseBounds
  viewportOptions?: ViewportOptions
}): {
  boundsMinX: number
  boundsMinY: number
  boundsMaxX: number
  boundsMaxY: number
  padding: number
} => {
  let padding = drawPaddingOutsideBoard ? 1 : 0

  let boundsMinX =
    drawPaddingOutsideBoard || !baseBounds.hasBoardBounds
      ? baseBounds.minX
      : baseBounds.boardMinX
  let boundsMinY =
    drawPaddingOutsideBoard || !baseBounds.hasBoardBounds
      ? baseBounds.minY
      : baseBounds.boardMinY
  let boundsMaxX =
    drawPaddingOutsideBoard || !baseBounds.hasBoardBounds
      ? baseBounds.maxX
      : baseBounds.boardMaxX
  let boundsMaxY =
    drawPaddingOutsideBoard || !baseBounds.hasBoardBounds
      ? baseBounds.maxY
      : baseBounds.boardMaxY

  let hasPanelBounds = false
  let panelMinX = Number.POSITIVE_INFINITY
  let panelMinY = Number.POSITIVE_INFINITY
  let panelMaxX = Number.NEGATIVE_INFINITY
  let panelMaxY = Number.NEGATIVE_INFINITY

  const panelBoundsById = new Map<string, Bounds>()
  const boardBoundsById = new Map<string, Bounds>()

  for (const elm of circuitJson) {
    if (elm.type === "pcb_panel") {
      const panel = elm as PcbPanel
      const panelBounds = rectBounds(panel.center, panel.width, panel.height)
      if (!panelBounds) continue
      panelMinX = Math.min(panelMinX, panelBounds.minX)
      panelMinY = Math.min(panelMinY, panelBounds.minY)
      panelMaxX = Math.max(panelMaxX, panelBounds.maxX)
      panelMaxY = Math.max(panelMaxY, panelBounds.maxY)
      hasPanelBounds = true
      if (panel.pcb_panel_id) {
        panelBoundsById.set(panel.pcb_panel_id, panelBounds)
      }
    } else if (elm.type === "pcb_board") {
      const board = elm as PcbBoard
      const outlineBounds = getOutlineBounds(board.outline)
      const boardBounds =
        outlineBounds ?? rectBounds(board.center, board.width, board.height)
      if (boardBounds && board.pcb_board_id) {
        boardBoundsById.set(board.pcb_board_id, boardBounds)
      }
    }
  }

  if (viewportOptions?.viewport) {
    const { minX, minY, maxX, maxY } = viewportOptions.viewport
    boundsMinX = minX
    boundsMinY = minY
    boundsMaxX = maxX
    boundsMaxY = maxY
    padding = 0
  } else if (viewportOptions?.viewportTarget?.pcb_panel_id) {
    const panelBounds = panelBoundsById.get(
      viewportOptions.viewportTarget.pcb_panel_id,
    )
    if (!panelBounds) {
      throw new Error(
        `Viewport target panel '${viewportOptions.viewportTarget.pcb_panel_id}' not found`,
      )
    }
    boundsMinX = panelBounds.minX
    boundsMinY = panelBounds.minY
    boundsMaxX = panelBounds.maxX
    boundsMaxY = panelBounds.maxY
    padding = 0
  } else if (viewportOptions?.viewportTarget?.pcb_board_id) {
    const boardBounds = boardBoundsById.get(
      viewportOptions.viewportTarget.pcb_board_id,
    )
    if (!boardBounds) {
      throw new Error(
        `Viewport target board '${viewportOptions.viewportTarget.pcb_board_id}' not found`,
      )
    }
    boundsMinX = boardBounds.minX
    boundsMinY = boardBounds.minY
    boundsMaxX = boardBounds.maxX
    boundsMaxY = boardBounds.maxY
    padding = 0
  } else if (hasPanelBounds) {
    boundsMinX = panelMinX
    boundsMinY = panelMinY
    boundsMaxX = panelMaxX
    boundsMaxY = panelMaxY
  }

  return { boundsMinX, boundsMinY, boundsMaxX, boundsMaxY, padding }
}

function rectBounds(
  center: Point | undefined,
  width: number | undefined,
  height: number | undefined,
): Bounds | undefined {
  if (!center || width === undefined || height === undefined) return
  const cx = distance.parse(center.x)
  const cy = distance.parse(center.y)
  if (cx === undefined || cy === undefined) return
  const numericWidth = distance.parse(width)
  const numericHeight = distance.parse(height)
  if (numericWidth === undefined || numericHeight === undefined) return
  const halfW = numericWidth / 2
  const halfH = numericHeight / 2
  return {
    minX: cx - halfW,
    minY: cy - halfH,
    maxX: cx + halfW,
    maxY: cy + halfH,
  }
}

function getOutlineBounds(outline: Point[] | undefined): Bounds | undefined {
  if (!outline || outline.length < 3) return
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const pt of outline) {
    const x = distance.parse(pt.x)
    const y = distance.parse(pt.y)
    if (x === undefined || y === undefined) continue
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return
  if (!Number.isFinite(maxX) || !Number.isFinite(maxY)) return
  return { minX, minY, maxX, maxY }
}
