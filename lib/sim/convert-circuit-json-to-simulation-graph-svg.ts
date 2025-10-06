import type { AnyCircuitElement } from "circuit-json"
import { stringify } from "svgson"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import {
  type CircuitJsonWithSimulation,
  isSimulationExperiment,
  isSimulationTransientVoltageGraph,
  type SimulationExperimentElement,
  type SimulationTransientVoltageGraphElement,
} from "./types"

interface ConvertSimulationGraphParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_transient_voltage_graph_ids?: string[]
  width?: number
  height?: number
  includeVersion?: boolean
}

interface PreparedSimulationGraph {
  graph: SimulationTransientVoltageGraphElement
  points: Array<{ timeMs: number; voltage: number }>
  color: string
  label: string
}

interface AxisInfo {
  domainMin: number
  domainMax: number
  ticks: number[]
}

type ScaleFn = (value: number) => number

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 600
const MARGIN = { top: 64, right: 100, bottom: 80, left: 100 }
const FALLBACK_LINE_COLOR = "#1f77b4"

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_voltage_graph_ids,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion,
}: ConvertSimulationGraphParams): string {
  const selectedIds = simulation_transient_voltage_graph_ids
    ? new Set(simulation_transient_voltage_graph_ids)
    : null

  const experiment = circuitJson.find(
    (element): element is SimulationExperimentElement =>
      isSimulationExperiment(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const graphs = circuitJson.filter(
    (element): element is SimulationTransientVoltageGraphElement =>
      isSimulationTransientVoltageGraph(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!selectedIds ||
        selectedIds.has(element.simulation_transient_voltage_graph_id)),
  )

  if (graphs.length === 0) {
    throw new Error(
      `No simulation_transient_voltage_graph elements found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }

  const preparedGraphs = prepareSimulationGraphs(graphs)
  const allPoints = preparedGraphs.flatMap((entry) => entry.points)

  if (allPoints.length === 0) {
    throw new Error(
      `simulation_transient_voltage_graph elements for simulation_experiment_id "${simulation_experiment_id}" do not contain any datapoints`,
    )
  }

  const timeAxis = buildAxisInfo(allPoints.map((point) => point.timeMs))
  const voltageAxis = buildAxisInfo(allPoints.map((point) => point.voltage))

  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right)
  const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom)

  const scaleX = createLinearScale(
    timeAxis.domainMin,
    timeAxis.domainMax,
    MARGIN.left,
    MARGIN.left + plotWidth,
  )
  const scaleY = createLinearScale(
    voltageAxis.domainMin,
    voltageAxis.domainMax,
    MARGIN.top + plotHeight,
    MARGIN.top,
  )

  const clipPathId = createClipPathId(simulation_experiment_id)
  const softwareUsedString = getSoftwareUsedString(
    circuitJson as AnyCircuitElement[],
  )
  const version = CIRCUIT_TO_SVG_VERSION

  const titleNode = createTitleNode(experiment, width)

  const svgChildren: SvgObject[] = [
    createStyleNode(),
    createBackgroundRect(width, height),
    createDefsNode(clipPathId, plotWidth, plotHeight),
    createPlotBackground(plotWidth, plotHeight),
    createGridLines({
      timeAxis,
      voltageAxis,
      scaleX,
      scaleY,
      plotWidth,
      plotHeight,
    }),
    createDataGroup(preparedGraphs, clipPathId, scaleX, scaleY),
    createAxes({
      timeAxis,
      voltageAxis,
      scaleX,
      scaleY,
      plotWidth,
      plotHeight,
    }),
    createLegend(preparedGraphs, width),
    ...(titleNode ? [titleNode] : []),
  ]

  const svgObject: SvgObject = svgElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: width.toString(),
      height: height.toString(),
      viewBox: `0 0 ${formatNumber(width)} ${formatNumber(height)}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...(experiment?.name && {
        "data-simulation-experiment-name": experiment.name,
      }),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    svgChildren,
  )

  return stringify(svgObject)
}

function prepareSimulationGraphs(
  graphs: SimulationTransientVoltageGraphElement[],
): PreparedSimulationGraph[] {
  const palette = Array.isArray(colorMap.palette) ? colorMap.palette : []

  return graphs
    .map((graph, index) => {
      const points = createGraphPoints(graph)
      const paletteColor =
        palette.length > 0
          ? palette[index % palette.length]
          : FALLBACK_LINE_COLOR
      const color = paletteColor ?? FALLBACK_LINE_COLOR
      const label =
        graph.name ||
        (graph.schematic_voltage_probe_id
          ? `Probe ${graph.schematic_voltage_probe_id}`
          : graph.simulation_transient_voltage_graph_id)

      return { graph, points, color, label }
    })
    .filter((entry) => entry.points.length > 0)
}

function createGraphPoints(
  graph: SimulationTransientVoltageGraphElement,
): Array<{ timeMs: number; voltage: number }> {
  const timestamps = getTimestamps(graph)
  const length = Math.min(timestamps.length, graph.voltage_levels.length)
  const points: Array<{ timeMs: number; voltage: number }> = []

  for (let index = 0; index < length; index++) {
    const timeMs = Number(timestamps[index] ?? Number.NaN)
    const voltage = Number(graph.voltage_levels[index] ?? Number.NaN)

    if (!Number.isFinite(timeMs) || !Number.isFinite(voltage)) continue

    points.push({ timeMs, voltage })
  }

  return points
}

function getTimestamps(
  graph: SimulationTransientVoltageGraphElement,
): number[] {
  if (
    Array.isArray(graph.timestamps_ms) &&
    graph.timestamps_ms.length === graph.voltage_levels.length
  ) {
    return graph.timestamps_ms.map((value) => Number(value))
  }

  const count = graph.voltage_levels.length
  if (count === 0) return []

  const timestamps: number[] = []
  for (let index = 0; index < count; index++) {
    timestamps.push(graph.start_time_ms + graph.time_per_step * index)
  }

  const lastTimestamp =
    timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined
  if (
    lastTimestamp !== undefined &&
    Number.isFinite(graph.end_time_ms) &&
    Number.isFinite(lastTimestamp) &&
    Math.abs(lastTimestamp - graph.end_time_ms) > graph.time_per_step / 2
  ) {
    timestamps.push(graph.end_time_ms)
  }

  return timestamps
}

function buildAxisInfo(values: number[]): AxisInfo {
  if (values.length === 0) {
    return {
      domainMin: 0,
      domainMax: 1,
      ticks: [0, 1],
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    const offset = min === 0 ? 1 : Math.abs(min) * 0.1 || 1
    return {
      domainMin: min - offset,
      domainMax: min + offset,
      ticks: [min - offset, min, min + offset],
    }
  }

  const ticks = generateTickValues(min, max)
  const safeTicks = ticks.length > 0 ? ticks : [min, max]
  const domainMin = safeTicks[0]!
  const domainMax = safeTicks[safeTicks.length - 1]!

  return { domainMin, domainMax, ticks: safeTicks }
}

function generateTickValues(min: number, max: number, desired = 6): number[] {
  const span = max - min
  if (!Number.isFinite(span) || span <= Number.EPSILON) {
    return [min, max]
  }

  const step = niceStep(span / Math.max(1, desired - 1))
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const values: number[] = []

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    values.push(Number.parseFloat(value.toPrecision(12)))
  }

  return values
}

function niceStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 1

  const exponent = Math.floor(Math.log10(step))
  const fraction = step / Math.pow(10, exponent)

  let niceFraction: number
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10

  return niceFraction * Math.pow(10, exponent)
}

function createLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): ScaleFn {
  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
    const midpoint = (rangeMin + rangeMax) / 2
    return () => midpoint
  }

  const span = domainMax - domainMin
  if (Math.abs(span) < Number.EPSILON) {
    const midpoint = (rangeMin + rangeMax) / 2
    return () => midpoint
  }

  return (value: number) =>
    rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

function createStyleNode(): SvgObject {
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
.legend-label { fill: rgba(0, 0, 0, 0.75); font-size: 13px; }
.legend-line { stroke-width: 3; }
.simulation-line { fill: none; stroke-width: 2.5; }
.simulation-point { stroke-width: 1.5; fill: #ffffff; }
.chart-title { fill: rgba(0, 0, 0, 0.85); font-size: 18px; font-weight: 600; }
`

  return svgElement("style", {}, [textNode(content)])
}

function createBackgroundRect(width: number, height: number): SvgObject {
  return svgElement("rect", {
    class: "background",
    x: "0",
    y: "0",
    width: formatNumber(width),
    height: formatNumber(height),
  })
}

function createDefsNode(
  clipPathId: string,
  plotWidth: number,
  plotHeight: number,
): SvgObject {
  return svgElement("defs", {}, [
    svgElement("clipPath", { id: clipPathId }, [
      svgElement("rect", {
        x: formatNumber(MARGIN.left),
        y: formatNumber(MARGIN.top),
        width: formatNumber(plotWidth),
        height: formatNumber(plotHeight),
      }),
    ]),
  ])
}

function createPlotBackground(
  plotWidth: number,
  plotHeight: number,
): SvgObject {
  return svgElement("rect", {
    class: "plot-background",
    x: formatNumber(MARGIN.left),
    y: formatNumber(MARGIN.top),
    width: formatNumber(plotWidth),
    height: formatNumber(plotHeight),
  })
}

interface GridLinesOptions {
  timeAxis: AxisInfo
  voltageAxis: AxisInfo
  scaleX: ScaleFn
  scaleY: ScaleFn
  plotWidth: number
  plotHeight: number
}

function createGridLines({
  timeAxis,
  voltageAxis,
  scaleX,
  scaleY,
  plotWidth,
  plotHeight,
}: GridLinesOptions): SvgObject {
  const top = MARGIN.top
  const bottom = MARGIN.top + plotHeight
  const left = MARGIN.left
  const right = MARGIN.left + plotWidth

  const children: SvgObject[] = []

  for (const tick of timeAxis.ticks) {
    const x = formatNumber(scaleX(tick))
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-x",
        x1: x,
        y1: formatNumber(top),
        x2: x,
        y2: formatNumber(bottom),
      }),
    )
  }

  for (const tick of voltageAxis.ticks) {
    const y = formatNumber(scaleY(tick))
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-y",
        x1: formatNumber(left),
        y1: y,
        x2: formatNumber(right),
        y2: y,
      }),
    )
  }

  return svgElement("g", { class: "grid" }, children)
}

interface AxesOptions {
  timeAxis: AxisInfo
  voltageAxis: AxisInfo
  scaleX: ScaleFn
  scaleY: ScaleFn
  plotWidth: number
  plotHeight: number
}

function createAxes({
  timeAxis,
  voltageAxis,
  scaleX,
  scaleY,
  plotWidth,
  plotHeight,
}: AxesOptions): SvgObject {
  const bottom = MARGIN.top + plotHeight
  const left = MARGIN.left
  const right = MARGIN.left + plotWidth

  const children: SvgObject[] = [
    svgElement("line", {
      class: "axis axis-x",
      x1: formatNumber(left),
      y1: formatNumber(bottom),
      x2: formatNumber(right),
      y2: formatNumber(bottom),
    }),
    svgElement("line", {
      class: "axis axis-y",
      x1: formatNumber(left),
      y1: formatNumber(MARGIN.top),
      x2: formatNumber(left),
      y2: formatNumber(bottom),
    }),
  ]

  for (const tick of timeAxis.ticks) {
    const x = formatNumber(scaleX(tick))
    children.push(
      svgElement("line", {
        class: "axis-tick axis-tick-x",
        x1: x,
        y1: formatNumber(bottom),
        x2: x,
        y2: formatNumber(bottom + 6),
      }),
    )
    children.push(
      svgElement(
        "text",
        {
          class: "axis-label axis-label-x",
          x,
          y: formatNumber(bottom + 22),
          "text-anchor": "middle",
        },
        [textNode(formatTickLabel(tick, timeAxis.ticks))],
      ),
    )
  }

  for (const tick of voltageAxis.ticks) {
    const y = formatNumber(scaleY(tick))
    children.push(
      svgElement("line", {
        class: "axis-tick axis-tick-y",
        x1: formatNumber(left - 6),
        y1: y,
        x2: formatNumber(left),
        y2: y,
      }),
    )
    children.push(
      svgElement(
        "text",
        {
          class: "axis-label axis-label-y",
          x: formatNumber(left - 10),
          y,
          "text-anchor": "end",
          "dominant-baseline": "middle",
        },
        [textNode(formatTickLabel(tick, voltageAxis.ticks))],
      ),
    )
  }

  children.push(
    svgElement(
      "text",
      {
        class: "axis-title axis-title-x",
        x: formatNumber(left + plotWidth / 2),
        y: formatNumber(bottom + 48),
        "text-anchor": "middle",
      },
      [textNode("Time (ms)")],
    ),
    svgElement(
      "text",
      {
        class: "axis-title axis-title-y",
        x: formatNumber(left - 64),
        y: formatNumber(MARGIN.top + plotHeight / 2),
        transform: `rotate(-90 ${formatNumber(left - 64)} ${formatNumber(
          MARGIN.top + plotHeight / 2,
        )})`,
        "text-anchor": "middle",
      },
      [textNode("Voltage (V)")],
    ),
  )

  return svgElement("g", { class: "axes" }, children)
}

function createLegend(
  graphs: PreparedSimulationGraph[],
  width: number,
): SvgObject {
  const children = graphs.map((entry, index) => {
    const y = MARGIN.top + index * 24
    const x = width - MARGIN.right + 20
    return svgElement(
      "g",
      {
        class: "legend-item",
        transform: `translate(${formatNumber(x)} ${formatNumber(y)})`,
      },
      [
        svgElement("line", {
          class: "legend-line",
          x1: "0",
          y1: "0",
          x2: "24",
          y2: "0",
          stroke: entry.color,
        }),
        svgElement(
          "text",
          {
            class: "legend-label",
            x: "32",
            y: "0",
            "dominant-baseline": "middle",
          },
          [textNode(entry.label)],
        ),
      ],
    )
  })

  return svgElement("g", { class: "legend" }, children)
}

function createDataGroup(
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
      const y = formatNumber(scaleY(point.voltage))
      commands.push(`${index === 0 ? "M" : "L"} ${x} ${y}`)
    })

    const baseAttributes: Record<string, string> = {
      class: "simulation-line",
      d: commands.join(" "),
      stroke: entry.color,
      "clip-path": `url(#${clipPathId})`,
      "data-simulation-transient-voltage-graph-id":
        entry.graph.simulation_transient_voltage_graph_id,
    }

    if (entry.graph.schematic_voltage_probe_id) {
      baseAttributes["data-schematic-voltage-probe-id"] =
        entry.graph.schematic_voltage_probe_id
    }

    if (entry.graph.subcircuit_connecivity_map_key) {
      baseAttributes["data-subcircuit-connectivity-map-key"] =
        entry.graph.subcircuit_connecivity_map_key
    }

    const pointElements = entry.points.map((point) => {
      const cx = formatNumber(scaleX(point.timeMs))
      const cy = formatNumber(scaleY(point.voltage))
      return svgElement("circle", {
        class: "simulation-point",
        cx,
        cy,
        r: "3.5",
        stroke: entry.color,
        fill: "#ffffff",
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
    processedGraphs.forEach((graphInfo) => {
      const offsetIndex = (graphInfo.graphIndex + cycle) % LINE_REPEAT_COUNT
      const dashOffset = formatNumber(offsetIndex * dashOffsetStep)
      lineElements.push(
        svgElement("path", {
          ...graphInfo.pathAttributes,
          "stroke-dasharray": dashArrayString,
          "stroke-dashoffset": dashOffset,
        }),
      )
    })
  }

  const pointElements = processedGraphs.flatMap(
    (graphInfo) => graphInfo.pointElements,
  )

  return svgElement("g", { class: "data-series" }, [
    ...lineElements,
    ...pointElements,
  ])
}

function createTitleNode(
  experiment: SimulationExperimentElement | undefined,
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

function createClipPathId(simulationExperimentId: string): string {
  const sanitized = simulationExperimentId.replace(/[^a-zA-Z0-9_-]+/g, "-")
  return `simulation-graph-${sanitized}`
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Number.parseFloat(value.toFixed(6))
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toString()
}

function formatTickLabel(value: number, ticks: number[]): string {
  if (ticks.length <= 1) return formatNumber(value)
  const span = ticks[ticks.length - 1]! - ticks[0]!
  if (!Number.isFinite(span) || span === 0) return formatNumber(value)

  const precision = span >= 100 ? 0 : span >= 10 ? 1 : span >= 1 ? 2 : 3
  const factor = Math.pow(10, precision)
  const rounded = Math.round(value * factor) / factor
  const fixed = rounded.toFixed(precision)
  return fixed
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "")
}

function svgElement(
  name: string,
  attributes: Record<string, string>,
  children: SvgObject[] = [],
): SvgObject {
  return {
    name,
    type: "element",
    value: "",
    attributes,
    children,
  }
}

function textNode(value: string): SvgObject {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }
}
