import type { SimulationExperiment } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import {
  MARGIN,
  type PreparedSimulationGraph,
  type ScaleFn,
  formatNumber,
  getGraphId,
  getGraphIdDataAttributeName,
  svgElement,
  textNode,
} from "./simulation-graph-svg-shared"

function getStringProperty(value: object, key: string): string | undefined {
  const propertyValue = (value as Record<string, unknown>)[key]
  if (typeof propertyValue !== "string") return undefined
  return propertyValue
}

export function createDataGroup(
  graphs: PreparedSimulationGraph[],
  clipPathId: string,
  scaleX: ScaleFn,
  scaleY: ScaleFn,
): SvgObject {
  const LINE_REPEAT_COUNT = 3
  const DASH_PATTERN = [4, 8]
  const dashArrayString = DASH_PATTERN.map((value) => formatNumber(value)).join(
    " ",
  )
  const dashCycleLength = DASH_PATTERN.reduce((sum, value) => sum + value, 0)
  const dashOffsetStep = dashCycleLength / LINE_REPEAT_COUNT

  interface GraphRenderingInfo {
    entry: PreparedSimulationGraph
    graphIndex: number
    pathAttributes: Record<string, string>
    pointElements: SvgObject[]
  }

  const processedGraphs: GraphRenderingInfo[] = []

  graphs.forEach((entry, graphIndex) => {
    if (entry.points.length === 0) return

    const commands: string[] = []
    entry.points.forEach((point, index) => {
      const x = formatNumber(scaleX(point.timeMs))
      const y = formatNumber(scaleY(point.displayValue))
      commands.push(`${index === 0 ? "M" : "L"} ${x} ${y}`)
    })

    const baseAttributes: Record<string, string> = {
      class: "simulation-line",
      d: commands.join(" "),
      stroke: entry.color,
      "clip-path": `url(#${clipPathId})`,
      [getGraphIdDataAttributeName(entry.graph)]: getGraphId(entry.graph),
    }

    if (entry.graph.source_component_id) {
      baseAttributes["data-source-component-id"] =
        entry.graph.source_component_id
    }

    const sourceProbeId = getStringProperty(entry.graph, "source_probe_id")
    if (sourceProbeId) {
      baseAttributes["data-source-probe-id"] = sourceProbeId
    }

    const sourceProbeName = getStringProperty(entry.graph, "source_probe_name")
    if (sourceProbeName) {
      baseAttributes["data-source-probe-name"] = sourceProbeName
    }

    if (entry.graph.subcircuit_connectivity_map_key) {
      baseAttributes["data-subcircuit-connectivity-map-key"] =
        entry.graph.subcircuit_connectivity_map_key
    }

    const pointElements = entry.points.map((point) => {
      const cx = formatNumber(scaleX(point.timeMs))
      const cy = formatNumber(scaleY(point.displayValue))
      return svgElement("circle", {
        class: "simulation-point",
        cx,
        cy,
        r: "2.5",
        fill: entry.color,
        "clip-path": `url(#${clipPathId})`,
      })
    })

    processedGraphs.push({
      entry,
      graphIndex,
      pathAttributes: baseAttributes,
      pointElements,
    })
  })

  const lineElements: SvgObject[] = []

  for (let cycle = 0; cycle < LINE_REPEAT_COUNT; cycle++) {
    for (const graphInfo of processedGraphs) {
      const offsetIndex = (graphInfo.graphIndex + cycle) % LINE_REPEAT_COUNT
      const dashOffset = formatNumber(offsetIndex * dashOffsetStep)
      lineElements.push(
        svgElement("path", {
          ...graphInfo.pathAttributes,
          "stroke-dasharray": dashArrayString,
          "stroke-dashoffset": dashOffset,
        }),
      )
    }
  }

  const pointElements = processedGraphs.flatMap(
    (graphInfo) => graphInfo.pointElements,
  )

  return svgElement("g", { class: "data-series" }, [
    ...lineElements,
    ...pointElements,
  ])
}

export function createTitleNode(
  experiment: SimulationExperiment | undefined,
  width: number,
): SvgObject | null {
  if (!experiment?.name) return null

  return svgElement(
    "text",
    {
      class: "chart-title",
      x: formatNumber(width / 2),
      y: formatNumber(MARGIN.top - 40),
      "text-anchor": "middle",
    },
    [textNode(experiment.name)],
  )
}
