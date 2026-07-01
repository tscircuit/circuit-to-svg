export const SCOPE_LEGEND_CARD_WIDTH = 118
export const SCOPE_LEGEND_CARD_HEIGHT = 94
export const SCOPE_LEGEND_CARD_GAP = 18

export interface ScopeLegendGridLayout {
  columns: number
  rows: number
  x: number
  height: number
}

export function getScopeLegendGridLayout(
  graphCount: number,
  containerWidth: number,
): ScopeLegendGridLayout {
  // Fit as many cards per row as the available width allows. A row of `n`
  // columns needs n * CARD_WIDTH + (n - 1) * CARD_GAP of horizontal space.
  const columnsThatFit = Math.floor(
    (containerWidth + SCOPE_LEGEND_CARD_GAP) /
      (SCOPE_LEGEND_CARD_WIDTH + SCOPE_LEGEND_CARD_GAP),
  )
  const columns = Math.max(1, Math.min(columnsThatFit, graphCount))
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
