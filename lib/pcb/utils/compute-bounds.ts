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
      if (typeof panel.width !== "number" || typeof panel.height !== "number")
        continue
      const width = panel.width
      const height = panel.height
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
      } else if (hasCenterWidthHeight(circuitJsonElm)) {
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
      if (
        circuitJsonElm.shape === "rect" ||
        circuitJsonElm.shape === "rotated_rect" ||
        circuitJsonElm.shape === "pill"
      ) {
        const width = circuitJsonElm.width
        const height = circuitJsonElm.height
        if (typeof width !== "number" || typeof height !== "number") {
          continue
        }
        updateBounds(
          { x: circuitJsonElm.x, y: circuitJsonElm.y },
          width,
          height,
        )
      } else if (circuitJsonElm.shape === "circle") {
        const radius = distance.parse(circuitJsonElm.radius)
        if (radius !== undefined) {
          updateBounds(
            { x: circuitJsonElm.x, y: circuitJsonElm.y },
            radius * 2,
            radius * 2,
          )
        }
      } else if (circuitJsonElm.shape === "polygon") {
        updateTraceBounds(circuitJsonElm.points)
      }
    } else if ("x" in circuitJsonElm && "y" in circuitJsonElm) {
      updateBounds({ x: circuitJsonElm.x, y: circuitJsonElm.y }, 0, 0)
    } else if ("route" in circuitJsonElm) {
      updateTraceBounds(circuitJsonElm.route)
    } else if (
      circuitJsonElm.type === "pcb_note_rect" ||
      circuitJsonElm.type === "pcb_fabrication_note_rect"
    ) {
      if (hasCenterWidthHeight(circuitJsonElm)) {
        updateBounds(
          circuitJsonElm.center,
          circuitJsonElm.width,
          circuitJsonElm.height,
        )
      }
    } else if (circuitJsonElm.type === "pcb_cutout") {
      const cutout = circuitJsonElm as PcbCutout
      if (cutout.shape === "rect") {
        const { width, height } = cutout
        if (typeof width === "number" && typeof height === "number") {
          updateBounds(cutout.center, width, height)
        }
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
        const { width, height } = cutout
        if (typeof width === "number" && typeof height === "number") {
          updateBounds(cutout.center, width, height)
        }
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
