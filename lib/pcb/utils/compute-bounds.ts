import type {
  AnyCircuitElement,
  PcbCutout,
  PcbPanel,
  Point,
} from "circuit-json"
import { distance } from "circuit-json"
import type { Bounds } from "@tscircuit/math-utils"
import { getBoardId, getPanelId } from "./id-helpers"

export interface ComputeBoundsOptions {
  circuitJson: AnyCircuitElement[]
  drawPaddingOutsideBoard: boolean
  viewport?: Bounds
  viewportTarget?: {
    pcb_panel_id?: string
    pcb_board_id?: string
  }
}

export interface ComputedBoundsResult {
  boundsMinX: number
  boundsMinY: number
  boundsMaxX: number
  boundsMaxY: number
  padding: number
  overallMinX: number
  overallMinY: number
  overallMaxX: number
  overallMaxY: number
}

export function computePcbBounds({
  circuitJson,
  drawPaddingOutsideBoard,
  viewport,
  viewportTarget,
}: ComputeBoundsOptions): ComputedBoundsResult {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let hasBounds = false

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

  const panelBoundsById = new Map<string, Bounds>()
  const boardBoundsById = new Map<string, Bounds>()

  for (const circuitJsonElm of circuitJson) {
    if (circuitJsonElm.type === "pcb_panel") {
      const panel = circuitJsonElm as PcbPanel
      const width = distance.parse(panel.width)
      const height = distance.parse(panel.height)
      if (width === undefined || height === undefined) {
        continue
      }
      const center = panel.center ?? { x: width / 2, y: height / 2 }
      updateBounds(center, width, height)
      updatePanelBounds({
        center,
        width,
        height,
        pcb_panel_id: getPanelId(panel),
      })
    } else if (circuitJsonElm.type === "pcb_board") {
      const boardId = getBoardId(circuitJsonElm)
      if (
        circuitJsonElm.outline &&
        Array.isArray(circuitJsonElm.outline) &&
        circuitJsonElm.outline.length >= 3
      ) {
        updateBoundsToIncludeOutline(circuitJsonElm.outline)
        updateBoardBoundsToIncludeOutline(circuitJsonElm.outline, boardId)
      } else if (
        "center" in circuitJsonElm &&
        "width" in circuitJsonElm &&
        "height" in circuitJsonElm
      ) {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
        updateBoardBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
          boardId,
        )
      }
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      const pad = circuitJsonElm as any
      if (
        pad.shape === "rect" ||
        pad.shape === "rotated_rect" ||
        pad.shape === "pill"
      ) {
        updateBounds({ x: pad.x, y: pad.y }, pad.width, pad.height)
      } else if (pad.shape === "circle") {
        const radius = distance.parse(pad.radius)
        if (radius !== undefined) {
          updateBounds({ x: pad.x, y: pad.y }, radius * 2, radius * 2)
        }
      } else if (pad.shape === "polygon") {
        updateTraceBounds(pad.points)
      }
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_note_rect" ||
      circuitJsonElm.type === "pcb_fabrication_note_rect"
    ) {
      updateBounds(
        (circuitJsonElm as any).center,
        (circuitJsonElm as any).width,
        (circuitJsonElm as any).height,
      )
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds(cutout.center, radius * 2, radius * 2)
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      }
    } else if (
      circuitJsonElm.type === "pcb_silkscreen_text" ||
      circuitJsonElm.type === "pcb_silkscreen_rect" ||
      circuitJsonElm.type === "pcb_silkscreen_circle" ||
      circuitJsonElm.type === "pcb_silkscreen_line"
    ) {
      updateSilkscreenBounds(circuitJsonElm)
    } else if (circuitJsonElm.type === "pcb_copper_text") {
      updateBounds(circuitJsonElm.anchor_position, 0, 0)
    } else if (circuitJsonElm.type === "pcb_copper_pour") {
      if (circuitJsonElm.shape === "rect") {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    }
  }

  let padding = drawPaddingOutsideBoard ? 1 : 0
  let boundsMinX: number
  let boundsMinY: number
  let boundsMaxX: number
  let boundsMaxY: number

  if (viewport) {
    boundsMinX = viewport.minX
    boundsMinY = viewport.minY
    boundsMaxX = viewport.maxX
    boundsMaxY = viewport.maxY
    padding = 0
  } else if (viewportTarget?.pcb_panel_id) {
    const panelBounds = panelBoundsById.get(viewportTarget.pcb_panel_id)
    if (!panelBounds) {
      throw new Error(
        `Viewport target panel '${viewportTarget.pcb_panel_id}' not found`,
      )
    }
    boundsMinX = panelBounds.minX
    boundsMinY = panelBounds.minY
    boundsMaxX = panelBounds.maxX
    boundsMaxY = panelBounds.maxY
    padding = 0
  } else if (viewportTarget?.pcb_board_id) {
    const boardBounds = boardBoundsById.get(viewportTarget.pcb_board_id)
    if (!boardBounds) {
      throw new Error(
        `Viewport target board '${viewportTarget.pcb_board_id}' not found`,
      )
    }
    boundsMinX = boardBounds.minX
    boundsMinY = boardBounds.minY
    boundsMaxX = boardBounds.maxX
    boundsMaxY = boardBounds.maxY
    padding = 0
  } else if (hasPanelBounds && Number.isFinite(panelMinX)) {
    boundsMinX = panelMinX
    boundsMinY = panelMinY
    boundsMaxX = panelMaxX
    boundsMaxY = panelMaxY
  } else {
    boundsMinX =
      drawPaddingOutsideBoard || !Number.isFinite(boardMinX) ? minX : boardMinX
    boundsMinY =
      drawPaddingOutsideBoard || !Number.isFinite(boardMinY) ? minY : boardMinY
    boundsMaxX =
      drawPaddingOutsideBoard || !Number.isFinite(boardMaxX) ? maxX : boardMaxX
    boundsMaxY =
      drawPaddingOutsideBoard || !Number.isFinite(boardMaxY) ? maxY : boardMaxY
  }

  return {
    boundsMinX,
    boundsMinY,
    boundsMaxX,
    boundsMaxY,
    padding,
    overallMinX: minX,
    overallMinY: minY,
    overallMaxX: maxX,
    overallMaxY: maxY,
  }

  function updateBounds(center: any, width: any, height: any) {
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

  function updateBoardBounds(
    center: any,
    width: any,
    height: any,
    pcb_board_id?: string,
  ) {
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
    if (pcb_board_id) {
      boardBoundsById.set(pcb_board_id, {
        minX: centerX - halfWidth,
        minY: centerY - halfHeight,
        maxX: centerX + halfWidth,
        maxY: centerY + halfHeight,
      })
    }
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

  function updateBoardBoundsToIncludeOutline(outline: Point[], id?: string) {
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
      if (id) {
        boardBoundsById.set(id, {
          minX: boardMinX,
          minY: boardMinY,
          maxX: boardMaxX,
          maxY: boardMaxY,
        })
      }
    }
  }

  function updateTraceBounds(route: any[]) {
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
      updateBounds(item.anchor_position, 0, 0)
    } else if (item.type === "pcb_silkscreen_path") {
      updateTraceBounds(item.route)
    } else if (item.type === "pcb_silkscreen_rect") {
      updateBounds(item.center, item.width, item.height)
    } else if (item.type === "pcb_silkscreen_circle") {
      const radius = distance.parse(item.radius)
      if (radius !== undefined) {
        updateBounds(item.center, radius * 2, radius * 2)
      }
    } else if (item.type === "pcb_silkscreen_line") {
      updateBounds({ x: item.x1, y: item.y1 }, 0, 0)
      updateBounds({ x: item.x2, y: item.y2 }, 0, 0)
    } else if (item.type === "pcb_cutout") {
      const cutout = item as PcbCutout
      if (cutout.shape === "rect") {
        updateBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        const radius = distance.parse(cutout.radius)
        if (radius !== undefined) {
          updateBounds(cutout.center, radius * 2, radius * 2)
        }
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      }
    }
  }

  function updatePanelBounds({
    center,
    width,
    height,
    pcb_panel_id,
  }: {
    center: any
    width: any
    height: any
    pcb_panel_id?: string
  }) {
    if (!center) return
    const centerX = distance.parse(center.x)
    const centerY = distance.parse(center.y)
    if (centerX === undefined || centerY === undefined) return
    const numericWidth = distance.parse(width) ?? 0
    const numericHeight = distance.parse(height) ?? 0
    const halfWidth = numericWidth / 2
    const halfHeight = numericHeight / 2
    panelMinX = Math.min(panelMinX, centerX - halfWidth)
    panelMinY = Math.min(panelMinY, centerY - halfHeight)
    panelMaxX = Math.max(panelMaxX, centerX + halfWidth)
    panelMaxY = Math.max(panelMaxY, centerY + halfHeight)
    hasPanelBounds = true
    if (pcb_panel_id) {
      panelBoundsById.set(pcb_panel_id, {
        minX: centerX - halfWidth,
        minY: centerY - halfHeight,
        maxX: centerX + halfWidth,
        maxY: centerY + halfHeight,
      })
    }
  }
}

