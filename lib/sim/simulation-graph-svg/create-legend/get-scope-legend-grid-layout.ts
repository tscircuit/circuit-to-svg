export const SCOPE_LEGEND_CARD_WIDTH = 118
export const SCOPE_LEGEND_CARD_HEIGHT = 94
export const SCOPE_LEGEND_CARD_GAP = 18

export interface ScopeLegendGridLayout {
  columns: number
  rows: number
  x: number
  height: number
}

interface ScopeLegendLayoutOptions {
  displayWidth?: number
}

export function getScopeLegendGridLayout(
  graphCount: number,
  containerWidth: number,
  options: ScopeLegendLayoutOptions = {},
): ScopeLegendGridLayout {
  let displayWidth = containerWidth
  if (options.displayWidth !== undefined) {
    displayWidth = Math.min(containerWidth, Math.max(1, options.displayWidth))
  }
  const displayScale = containerWidth > 0 ? displayWidth / containerWidth : 1
  const displayCardWidth = SCOPE_LEGEND_CARD_WIDTH * displayScale
  const displayCardGap = SCOPE_LEGEND_CARD_GAP * displayScale
  const maxColumnsThatFit = Math.max(
    1,
    Math.floor(
      (displayWidth + displayCardGap) / (displayCardWidth + displayCardGap),
    ),
  )
  const columns = Math.max(
    1,
    Math.min(maxColumnsThatFit, Math.max(1, graphCount)),
  )
  const rows = Math.max(1, Math.ceil(graphCount / columns))
  const width =
    columns * SCOPE_LEGEND_CARD_WIDTH + (columns - 1) * SCOPE_LEGEND_CARD_GAP
  const height =
    rows * SCOPE_LEGEND_CARD_HEIGHT + (rows - 1) * SCOPE_LEGEND_CARD_GAP

  return {
    columns,
    rows,
    x: Math.max(0, (containerWidth - width) / 2),
    height,
  }
}
