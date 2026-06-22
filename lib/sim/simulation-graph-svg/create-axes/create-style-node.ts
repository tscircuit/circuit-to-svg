import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { svgElement, textNode } from "../simulation-graph-svg-shared"

export function createStyleNode(): SvgObject {
  const content = `
:root { color-scheme: light; }
svg { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
.background { fill: ${colorMap.schematic.background}; }
.plot-background { fill: #ffffff; }
.grid-line { stroke: rgba(0, 0, 0, 0.08); stroke-width: 1; }
.axis { stroke: rgba(0, 0, 0, 0.6); stroke-width: 1.5; }
.axis-tick { stroke: rgba(0, 0, 0, 0.6); stroke-width: 1; }
.axis-label { fill: rgba(0, 0, 0, 0.75); font-size: 12px; }
.axis-title { fill: rgba(0, 0, 0, 0.9); font-size: 14px; font-weight: 600; }
.legend-label { fill: rgba(0, 0, 0, 0.75); font-size: 11px; }
.legend-line { stroke-width: 3; }
.scope-channel-card { fill: #ffffff; stroke: rgba(0, 0, 0, 0.22); stroke-width: 1; }
.scope-channel-header-text { fill: #ffffff; font-size: 14px; font-weight: 700; }
.scope-channel-detail { fill: rgba(0, 0, 0, 0.42); font-size: 14px; }
.simulation-line { fill: none; stroke-width: 2.5; }
.simulation-point { stroke-width: 0; }
.chart-title { fill: rgba(0, 0, 0, 0.85); font-size: 18px; font-weight: 600; }
`

  return svgElement("style", {}, [textNode(content)])
}
