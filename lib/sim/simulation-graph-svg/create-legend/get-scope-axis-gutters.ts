import {
  MARGIN,
  SCOPE_AXIS_LABEL_PADDING,
  SCOPE_AXIS_LABEL_WIDTH,
  SCOPE_AXIS_SPACING,
} from "../simulation-graph-svg-shared"

export function getScopeAxisGutters(graphCount: number): {
  left: number
  right: number
} {
  const leftAxisCount = Math.ceil(graphCount / 2)
  const rightAxisCount = Math.floor(graphCount / 2)

  return {
    left: getScopeAxisGutter(leftAxisCount),
    right: getScopeAxisGutter(rightAxisCount),
  }
}

function getScopeAxisGutter(axisCount: number): number {
  if (axisCount <= 1) return 0

  const requiredWidth =
    10 +
    (axisCount - 1) * SCOPE_AXIS_SPACING +
    6 +
    SCOPE_AXIS_LABEL_WIDTH +
    SCOPE_AXIS_LABEL_PADDING

  return Math.max(0, requiredWidth - MARGIN.left)
}
