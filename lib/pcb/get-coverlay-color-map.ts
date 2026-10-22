import type { PcbBoard } from "circuit-json"
import type { PcbColorMap, PcbColorOverrides } from "./colors"

const COVERLAY_COLORS = {
  yellow: { surface: "#cc9c33", coveredCopper: "#b58a2d" },
  black: { surface: "#111111", coveredCopper: "#111111" },
  white: { surface: "#ffffff", coveredCopper: "#ffffff" },
}

export function getCoverlayColorMap({
  board,
  colorMap,
  colorOverrides,
}: {
  board?: PcbBoard
  colorMap: PcbColorMap
  colorOverrides?: PcbColorOverrides
}): PcbColorMap {
  if (board?.material !== "flex" || board.coverlay_color === undefined) {
    return colorMap
  }
  const colors = COVERLAY_COLORS[board.coverlay_color]
  return {
    ...colorMap,
    substrate: colorOverrides?.substrate ?? COVERLAY_COLORS.yellow.surface,
    soldermask: {
      top: colorOverrides?.soldermask?.top ?? colors.surface,
      bottom: colorOverrides?.soldermask?.bottom ?? colors.surface,
    },
    soldermaskOverCopper: {
      top: colorOverrides?.soldermaskOverCopper?.top ?? colors.coveredCopper,
      bottom:
        colorOverrides?.soldermaskOverCopper?.bottom ?? colors.coveredCopper,
    },
    soldermaskWithCopperUnderneath: {
      top:
        colorOverrides?.soldermaskWithCopperUnderneath?.top ??
        colors.coveredCopper,
      bottom:
        colorOverrides?.soldermaskWithCopperUnderneath?.bottom ??
        colors.coveredCopper,
    },
  }
}
