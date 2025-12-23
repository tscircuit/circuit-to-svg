import type {
  AnyCircuitElement,
  PcbCutout,
  PcbPanel,
  Point,
} from "circuit-json"
import { distance } from "circuit-json"
import type { Bounds } from "@tscircuit/math-utils"
import { expandBounds } from "./expand-bounds"
import { getEmptyBounds } from "./get-empty-bounds"
import { isFiniteBounds } from "./is-finite-bounds"
import { getBoardId } from "./get-board-id"
import { getPanelId } from "./get-panel-id"
import { addRectToBounds } from "./add-rect-to-bounds"
import { addRectToBoundsWithId } from "./add-rect-to-bounds-with-id"

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
  viewportBounds: Bounds
  boundsContainingAllElements: Bounds
}

export function computePcbBounds({
  circuitJson,
  drawPaddingOutsideBoard,
  viewport,
  viewportTarget,
}: ComputeBoundsOptions): ComputedBoundsResult {
  const hasCenterWidthHeight = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & {
    center: Point
    width: number
    height: number
  } =>
    "center" in elm &&
    "width" in elm &&
    "height" in elm &&
    typeof (elm as { width: unknown }).width === "number" &&
    typeof (elm as { height: unknown }).height === "number"

  const hasCenterRadius = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & { center: Point; radius: number | string } =>
    "center" in elm && "radius" in elm

  const hasLineEndpoints = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & {
    x1: number
    y1: number
    x2: number
    y2: number
  } =>
    typeof (elm as { x1?: unknown }).x1 === "number" &&
    typeof (elm as { y1?: unknown }).y1 === "number" &&
    typeof (elm as { x2?: unknown }).x2 === "number" &&
    typeof (elm as { y2?: unknown }).y2 === "number"

  const hasNumericXY = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & { x: number; y: number } =>
    typeof (elm as { x?: unknown }).x === "number" &&
    typeof (elm as { y?: unknown }).y === "number"

  const hasRouteArray = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & { route: any[] } =>
    Array.isArray((elm as { route?: unknown }).route)

  const hasPointsArray = (
    elm: AnyCircuitElement,
  ): elm is AnyCircuitElement & { points: any[] } =>
    Array.isArray((elm as { points?: unknown }).points)

  const handlePanel = (panel: AnyCircuitElement): boolean => {
    if (panel.type !== "pcb_panel") return false
    const panelTyped = panel as PcbPanel
    if (
      typeof panelTyped.width !== "number" ||
      typeof panelTyped.height !== "number"
    )
      return true
    const width = panelTyped.width
    const height = panelTyped.height
    const center = panelTyped.center ?? { x: width / 2, y: height / 2 }
    updateBounds(center, width, height)
    updatePanelBounds({
      center,
      width,
      height,
      pcb_panel_id: getPanelId(panelTyped),
    })
    return true
  }

  const handleBoard = (board: AnyCircuitElement): boolean => {
    if (board.type !== "pcb_board") return false
    const boardId = getBoardId(board)
    if (
      board.outline &&
      Array.isArray(board.outline) &&
      board.outline.length >= 3
    ) {
      updateBoundsToIncludeOutline(board.outline)
      updateBoardBoundsToIncludeOutline(board.outline, boardId)
      return true
    }
    if (hasCenterWidthHeight(board)) {
      updateBounds(board.center, board.width, board.height)
      updateBoardBounds(board.center, board.width, board.height, boardId)
    }
    return true
  }

  const updateTraceIfPresent = (elm: AnyCircuitElement): boolean => {
    if (hasRouteArray(elm)) {
      updateTraceBounds(elm.route)
      return true
    }
    if (hasPointsArray(elm)) {
      updateTraceBounds(elm.points)
      return true
    }
    return false
  }

  let overallBounds = getEmptyBounds()
  let boardBounds = getEmptyBounds()
  let hasBoardBounds = false
  let panelBounds = getEmptyBounds()
  let hasPanelBounds = false

  const panelBoundsById = new Map<string, Bounds>()
  const boardBoundsById = new Map<string, Bounds>()

  for (const circuitJsonElm of circuitJson) {
    if (handlePanel(circuitJsonElm)) {
      continue
    } else if (handleBoard(circuitJsonElm)) {
      continue
    } else if (circuitJsonElm.type === "pcb_smtpad") {
      if (
        (circuitJsonElm.shape === "rect" ||
          circuitJsonElm.shape === "rotated_rect" ||
          circuitJsonElm.shape === "pill") &&
        typeof circuitJsonElm.width === "number" &&
        typeof circuitJsonElm.height === "number"
      ) {
        updateRectBounds(
          { x: circuitJsonElm.x, y: circuitJsonElm.y },
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      } else if (circuitJsonElm.shape === "circle") {
        updateCircleBounds(
          { x: circuitJsonElm.x, y: circuitJsonElm.y },
          circuitJsonElm.radius,
        )
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    } else if (hasNumericXY(circuitJsonElm)) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if (updateTraceIfPresent(circuitJsonElm)) {
      // handled
    } else if (
      circuitJsonElm.type === "pcb_note_rect" ||
      circuitJsonElm.type === "pcb_fabrication_note_rect"
    ) {
      if (hasCenterWidthHeight(circuitJsonElm)) {
        updateRectBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      }
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm as PcbCutout
      if (cutout.shape === "rect") {
        updateRectBounds(cutout.center, cutout.width, cutout.height)
      } else if (cutout.shape === "circle") {
        updateCircleBounds(cutout.center, cutout.radius)
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
        updateRectBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    }
  }

  const viewportBounds = (() => {
    if (viewport) return viewport
    if (viewportTarget?.pcb_panel_id) {
      const panel = panelBoundsById.get(viewportTarget.pcb_panel_id)
      if (!panel || !isFiniteBounds(panel)) {
        throw new Error(
          `Viewport target panel '${viewportTarget.pcb_panel_id}' not found`,
        )
      }
      return panel
    }
    if (viewportTarget?.pcb_board_id) {
      const board = boardBoundsById.get(viewportTarget.pcb_board_id)
      if (!board || !isFiniteBounds(board)) {
        throw new Error(
          `Viewport target board '${viewportTarget.pcb_board_id}' not found`,
        )
      }
      return board
    }
    if (drawPaddingOutsideBoard && isFiniteBounds(overallBounds)) {
      return overallBounds
    }
    if (hasPanelBounds && isFiniteBounds(panelBounds)) {
      return panelBounds
    }
    if (hasBoardBounds && isFiniteBounds(boardBounds)) {
      return boardBounds
    }
    if (isFiniteBounds(overallBounds)) {
      return overallBounds
    }
    throw new Error("No finite bounds found in circuit JSON")
  })()

  return {
    viewportBounds,
    boundsContainingAllElements: overallBounds,
  }

  function updateBounds(
    center: Point | undefined,
    width: number,
    height: number,
  ) {
    overallBounds = addRectToBounds(overallBounds, center, width, height)
  }

  function updateBoardBounds(
    center: Point | undefined,
    width: number,
    height: number,
    pcb_board_id?: string,
  ) {
    const { bounds, overall } = addRectToBoundsWithId(
      boardBounds,
      center,
      width,
      height,
      {
        id: pcb_board_id,
        byId: boardBoundsById,
        overall: overallBounds,
      },
    )
    boardBounds = bounds
    overallBounds = overall
    hasBoardBounds = true
  }

  function updateBoundsToIncludeOutline(outline: Point[]) {
    let updated = false
    for (const point of outline) {
      if (typeof point.x !== "number" || typeof point.y !== "number") continue
      const x = point.x
      const y = point.y
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
      if (typeof point.x !== "number" || typeof point.y !== "number") continue
      const x = point.x
      const y = point.y
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
      if (typeof point?.x !== "number" || typeof point?.y !== "number") continue
      const x = point.x
      const y = point.y
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
      updateRectBounds(item.center, item.width, item.height)
    } else if (item.type === "pcb_silkscreen_circle") {
      updateCircleBounds(item.center, item.radius)
    } else if (item.type === "pcb_silkscreen_line" && hasLineEndpoints(item)) {
      updateLineBounds(item)
    } else if (item.type === "pcb_cutout") {
      const cutout = item as PcbCutout
      if (cutout.shape === "rect") {
        const { width, height } = cutout
        if (typeof width === "number" && typeof height === "number") {
          updateRectBounds(cutout.center, width, height)
        }
      } else if (cutout.shape === "circle") {
        updateCircleBounds(cutout.center, cutout.radius)
      } else if (cutout.shape === "polygon") {
        updateTraceBounds(cutout.points)
      }
    }
  }

  function updateRectBounds(
    center: Point | undefined,
    width: number | undefined,
    height: number | undefined,
  ) {
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      !center ||
      typeof center.x !== "number" ||
      typeof center.y !== "number"
    )
      return
    updateBounds(center, width, height)
  }

  function updateCircleBounds(
    center: Point | undefined,
    radius: number | string | undefined,
  ) {
    if (!hasCenterRadius({ center, radius } as AnyCircuitElement)) return
    const parsedRadius = distance.parse(radius)
    if (parsedRadius === undefined) return
    updateBounds(center, parsedRadius * 2, parsedRadius * 2)
  }

  function updateLineBounds(
    line:
      | (AnyCircuitElement & { x1: number; y1: number; x2: number; y2: number })
      | {
          x1: number
          y1: number
          x2: number
          y2: number
        },
  ) {
    updateBounds({ x: line.x1, y: line.y1 }, 0, 0)
    updateBounds({ x: line.x2, y: line.y2 }, 0, 0)
  }

  function updatePanelBounds({
    center,
    width,
    height,
    pcb_panel_id,
  }: {
    center: Point | undefined
    width: number
    height: number
    pcb_panel_id?: string
  }) {
    const { bounds, overall } = addRectToBoundsWithId(
      panelBounds,
      center,
      width,
      height,
      {
        id: pcb_panel_id,
        byId: panelBoundsById,
        overall: overallBounds,
      },
    )
    panelBounds = bounds
    overallBounds = overall
    hasPanelBounds = true
  }
}
