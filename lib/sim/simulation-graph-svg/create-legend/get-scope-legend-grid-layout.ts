export const SCOPE_LEGEND_CARD_WIDTH = 118
export const SCOPE_LEGEND_CARD_HEIGHT = 94
export const SCOPE_LEGEND_CARD_GAP = 18
const SCOPE_LEGEND_MAX_COLUMNS = 3

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
  const columns = Math.max(
    1,
    Math.min(SCOPE_LEGEND_MAX_COLUMNS, Math.max(1, graphCount)),
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
