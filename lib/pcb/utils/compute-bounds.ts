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
  let overallBounds = getEmptyBounds()
  let boardBounds = getEmptyBounds()
  let hasBoardBounds = false
  let panelBounds = getEmptyBounds()
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
    const panel = panelBoundsById.get(viewportTarget.pcb_panel_id)
    if (!panel || !isFiniteBounds(panel)) {
      throw new Error(
        `Viewport target panel '${viewportTarget.pcb_panel_id}' not found`,
      )
    }
    ;({
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
    } = panel)
    padding = 0
  } else if (viewportTarget?.pcb_board_id) {
    const board = boardBoundsById.get(viewportTarget.pcb_board_id)
    if (!board || !isFiniteBounds(board)) {
      throw new Error(
        `Viewport target board '${viewportTarget.pcb_board_id}' not found`,
      )
    }
    ;({
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
    } = board)
    padding = 0
  } else if (hasPanelBounds && isFiniteBounds(panelBounds)) {
    ;({
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
    } = panelBounds)
  } else if (hasBoardBounds && isFiniteBounds(boardBounds)) {
    ;({
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
    } = boardBounds)
  } else if (isFiniteBounds(overallBounds)) {
    ;({
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
    } = overallBounds)
  } else {
    throw new Error("No finite bounds found in circuit JSON")
  }

  return {
    boundsMinX,
    boundsMinY,
    boundsMaxX,
    boundsMaxY,
    padding,
    overallMinX: overallBounds.minX,
    overallMinY: overallBounds.minY,
    overallMaxX: overallBounds.maxX,
    overallMaxY: overallBounds.maxY,
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
    const b: Bounds = {
      minX: centerX - halfWidth,
      minY: centerY - halfHeight,
      maxX: centerX + halfWidth,
      maxY: centerY + halfHeight,
    }
    overallBounds = expandBounds(overallBounds, b)
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
    const b: Bounds = {
      minX: centerX - halfWidth,
      minY: centerY - halfHeight,
      maxX: centerX + halfWidth,
      maxY: centerY + halfHeight,
    }
    boardBounds = expandBounds(boardBounds, b)
    overallBounds = expandBounds(overallBounds, b)
    hasBoardBounds = true
    if (pcb_board_id) {
      boardBoundsById.set(
        pcb_board_id,
        expandBounds(boardBoundsById.get(pcb_board_id) ?? getEmptyBounds(), b),
      )
    }
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      overallBounds = expandBounds(overallBounds, {
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
      })
      updated = true
    }
    if (updated) return
  }

  function updateBoardBoundsToIncludeOutline(outline: Point[], id?: string) {
    let updated = false
    for (const point of outline) {
      const x = distance.parse(point.x)
      const y = distance.parse(point.y)
      if (x === undefined || y === undefined) continue
      const b: Bounds = { minX: x, minY: y, maxX: x, maxY: y }
      boardBounds = expandBounds(boardBounds, b)
      overallBounds = expandBounds(overallBounds, b)
      updated = true
    }
    if (updated) {
      hasBoardBounds = true
      if (id) {
        boardBoundsById.set(
          id,
          expandBounds(
            boardBoundsById.get(id) ?? getEmptyBounds(),
            boardBounds,
          ),
        )
      }
    }
  }

  function updateTraceBounds(route: any[]) {
    for (const point of route) {
      const x = distance.parse(point?.x)
      const y = distance.parse(point?.y)
      if (x === undefined || y === undefined) continue
      overallBounds = expandBounds(overallBounds, {
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
      })
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
    const b: Bounds = {
      minX: centerX - halfWidth,
      minY: centerY - halfHeight,
      maxX: centerX + halfWidth,
      maxY: centerY + halfHeight,
    }
    panelBounds = expandBounds(panelBounds, b)
    overallBounds = expandBounds(overallBounds, b)
    hasPanelBounds = true
    if (pcb_panel_id) {
      panelBoundsById.set(
        pcb_panel_id,
        expandBounds(panelBoundsById.get(pcb_panel_id) ?? getEmptyBounds(), b),
      )
    }
  }
}

function getEmptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
}

function expandBounds(target: Bounds, source: Bounds): Bounds {
  return {
    minX: Math.min(target.minX, source.minX),
    minY: Math.min(target.minY, source.minY),
    maxX: Math.max(target.maxX, source.maxX),
    maxY: Math.max(target.maxY, source.maxY),
  }
}

function isFiniteBounds(b: Bounds): boolean {
  return (
    Number.isFinite(b.minX) &&
    Number.isFinite(b.minY) &&
    Number.isFinite(b.maxX) &&
    Number.isFinite(b.maxY)
  )
}
