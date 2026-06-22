import type { SimulationOscilloscopeTrace } from "circuit-json"
import {
  type SimulationScopeTraceDisplay,
  type SimulationTransientGraph,
  isCurrentGraph,
} from "../simulation-graph-svg-shared"

export function getScopeTraceDisplay(
  graph: SimulationTransientGraph,
  trace: SimulationOscilloscopeTrace | undefined,
): SimulationScopeTraceDisplay | undefined {
  if (!trace) return undefined

  return {
    displayName: trace.display_name,
    color: trace.color,
    center: trace.display_center_value,
    offsetDivs: trace.display_center_offset_divs,
    valuePerDiv: isCurrentGraph(graph)
      ? trace.amps_per_div
      : trace.volts_per_div,
  }
}
