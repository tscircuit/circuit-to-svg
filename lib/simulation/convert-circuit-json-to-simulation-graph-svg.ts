import type { AnyCircuitElement } from "circuit-json"
import { stringify } from "svgson"
import type { SvgObject } from "lib/svg-object"
import { colorMap as defaultColorMap } from "lib/utils/colors"
import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"

interface SimulationExperiment {
  type: "simulation_experiment"
  simulation_experiment_id: string
  name: string
  experiment_type: string
}

interface SimulationTransientVoltageGraph {
  type: "simulation_transient_voltage_graph"
  simulation_transient_voltage_graph_id: string
  simulation_experiment_id: string
  timestamps_ms?: number[]
  voltage_levels: number[]
  schematic_voltage_probe_id?: string
  subcircuit_connecivity_map_key?: string
  time_per_step: number
  start_time_ms: number
  end_time_ms: number
  name?: string
}

const DEFAULT_WIDTH = 1200
const DEFAULT_PER_GRAPH_HEIGHT = 240
const DEFAULT_GRAPH_GAP = 48
const LEFT_PADDING = 96
const RIGHT_PADDING = 48
const CHART_PADDING_TOP = 32
const CHART_PADDING_BOTTOM = 48
const TITLE_HEIGHT = 28
const X_TICK_COUNT = 5
const Y_TICK_COUNT = 4
const HEADER_GAP = 32
const TOP_MARGIN = 32
const BOTTOM_MARGIN = 56

type SimulationRelevantElement =
  | (AnyCircuitElement & { type: string })
  | SimulationExperiment
  | SimulationTransientVoltageGraph

function isSimulationExperiment(elm: any): elm is SimulationExperiment {
  return (
    elm &&
    typeof elm === "object" &&
    elm.type === "simulation_experiment" &&
    typeof elm.simulation_experiment_id === "string"
  )
}

function isSimulationTransientVoltageGraph(
  elm: any,
): elm is SimulationTransientVoltageGraph {
  return (
    elm &&
    typeof elm === "object" &&
    elm.type === "simulation_transient_voltage_graph" &&
    typeof elm.simulation_transient_voltage_graph_id === "string" &&
    typeof elm.simulation_experiment_id === "string" &&
    Array.isArray(elm.voltage_levels)
  )
}

function formatNumber(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return "0"
  }
  return Number.parseFloat(value.toFixed(3)).toString()
}

function formatVoltage(value: number): string {
  if (Math.abs(value) >= 1) {
    const rounded = value >= 10 ? value.toFixed(1) : value.toFixed(2)
    return `${rounded.replace(/\.0+$|(?<=[^0])0+$/, "")}V`
  }
  const milli = value * 1000
  const rounded = Math.abs(milli) >= 10 ? milli.toFixed(0) : milli.toFixed(1)
  return `${rounded.replace(/\.0+$|(?<=[^0])0+$/, "")}mV`
}

function formatTimeMs(value: number): string {
  if (Math.abs(value) >= 1000) {
    const seconds = value / 1000
    const rounded = seconds >= 10 ? seconds.toFixed(1) : seconds.toFixed(2)
    return `${rounded.replace(/\.0+$|(?<=[^0])0+$/, "")}s`
  }
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(2)
  return `${rounded.replace(/\.0+$|(?<=[^0])0+$/, "")}ms`
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_")
}

interface ConvertSimulationGraphArgs {
  circuitJson: AnyCircuitElement[]
  simulation_experiment_id: string
  width?: number
  perGraphHeight?: number
  graphGap?: number
}

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  width = DEFAULT_WIDTH,
  perGraphHeight = DEFAULT_PER_GRAPH_HEIGHT,
  graphGap = DEFAULT_GRAPH_GAP,
}: ConvertSimulationGraphArgs): string {
  const simulationElements = circuitJson as SimulationRelevantElement[]
  const experiment = simulationElements.find(
    (elm): elm is SimulationExperiment =>
      isSimulationExperiment(elm) &&
      elm.simulation_experiment_id === simulation_experiment_id,
  )

  const graphs = simulationElements.filter(
    (elm): elm is SimulationTransientVoltageGraph =>
      isSimulationTransientVoltageGraph(elm) &&
      elm.simulation_experiment_id === simulation_experiment_id,
  )

  if (graphs.length === 0) {
    throw new Error(
      `No simulation_transient_voltage_graph entries found for simulation_experiment_id \"${simulation_experiment_id}\"`,
    )
  }

  const headerText = experiment?.name ?? simulation_experiment_id
  const headerHeight = headerText ? HEADER_GAP : 0
  const graphsTotalHeight =
    graphs.length * perGraphHeight + Math.max(0, graphs.length - 1) * graphGap
  const height = TOP_MARGIN + headerHeight + graphsTotalHeight + BOTTOM_MARGIN

  const svgChildren: SvgObject[] = []
  const defsChildren: SvgObject[] = []

  svgChildren.push({
    name: "style",
    type: "element",
    attributes: {},
    children: [
      {
        type: "text",
        name: "",
        value: `
          .background { fill: ${defaultColorMap.schematic.background}; }
          .graph-area { fill: rgba(255, 255, 255, 0.8); stroke: rgba(0, 0, 0, 0.05); }
          .grid-line { stroke: rgba(0, 0, 0, 0.12); stroke-dasharray: 4 4; }
          .axis { stroke: rgba(0, 0, 0, 0.48); stroke-width: 1.5; }
          .tick-label { font-family: sans-serif; fill: rgba(0, 0, 0, 0.6); font-size: 18px; }
          .graph-title { font-family: sans-serif; fill: rgba(0, 0, 0, 0.8); font-size: 22px; font-weight: 600; }
          .voltage-path { stroke: ${defaultColorMap.schematic.wire}; fill: none; stroke-width: 3; }
          .no-data { font-family: sans-serif; fill: rgba(0, 0, 0, 0.5); font-size: 18px; font-style: italic; }
        `,
        children: [],
        attributes: {},
      },
    ],
    value: "",
  })

  svgChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "background",
      x: "0",
      y: "0",
      width: width.toString(),
      height: height.toString(),
    },
    children: [],
    value: "",
  })

  if (headerText) {
    svgChildren.push({
      name: "text",
      type: "element",
      attributes: {
        x: formatNumber(width / 2),
        y: formatNumber(TOP_MARGIN + 4),
        "text-anchor": "middle",
        "dominant-baseline": "hanging",
        class: "graph-title",
      },
      children: [
        {
          type: "text",
          name: "",
          value: headerText,
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
  }

  graphs.forEach((graph, index) => {
    const areaTop =
      TOP_MARGIN + headerHeight + index * (perGraphHeight + graphGap)
    const chartLeft = LEFT_PADDING
    const chartRight = width - RIGHT_PADDING
    const chartWidth = chartRight - chartLeft
    const innerTop = areaTop + TITLE_HEIGHT + CHART_PADDING_TOP
    const chartHeight =
      perGraphHeight - TITLE_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
    const innerBottom = innerTop + chartHeight

    const pairs = graph.voltage_levels.map((voltage, i) => {
      const timestamp = graph.timestamps_ms?.[i]
      if (timestamp != null) {
        return { t: timestamp, v: voltage }
      }
      const derived = graph.start_time_ms + i * graph.time_per_step
      return { t: derived, v: voltage }
    })

    const sortedPairs = [...pairs].sort((a, b) => a.t - b.t)
    const hasData = sortedPairs.length > 0

    let minTime = hasData
      ? Math.min(...sortedPairs.map((p) => p.t))
      : graph.start_time_ms
    let maxTime = hasData
      ? Math.max(...sortedPairs.map((p) => p.t))
      : graph.end_time_ms
    if (!hasData && (maxTime == null || maxTime <= minTime)) {
      maxTime = minTime + Math.max(graph.time_per_step, 1)
    }
    const timeRange = maxTime - minTime || 1

    let minVoltage = hasData ? Math.min(...sortedPairs.map((p) => p.v)) : 0
    let maxVoltage = hasData ? Math.max(...sortedPairs.map((p) => p.v)) : 1
    if (minVoltage === maxVoltage) {
      const padding = Math.max(Math.abs(minVoltage) * 0.1, 0.5)
      minVoltage -= padding
      maxVoltage += padding
    }
    const voltageRange = maxVoltage - minVoltage || 1

    const clipId = `clip-${sanitizeId(graph.simulation_transient_voltage_graph_id)}`

    defsChildren.push({
      name: "clipPath",
      type: "element",
      attributes: { id: clipId },
      children: [
        {
          name: "rect",
          type: "element",
          attributes: {
            x: formatNumber(chartLeft),
            y: formatNumber(innerTop),
            width: formatNumber(chartWidth),
            height: formatNumber(chartHeight),
          },
          children: [],
          value: "",
        },
      ],
      value: "",
    })

    const groupChildren: SvgObject[] = []

    groupChildren.push({
      name: "text",
      type: "element",
      attributes: {
        x: formatNumber(chartLeft),
        y: formatNumber(areaTop + 4),
        class: "graph-title",
        "text-anchor": "start",
        "dominant-baseline": "hanging",
      },
      children: [
        {
          type: "text",
          name: "",
          value:
            graph.name ??
            graph.schematic_voltage_probe_id ??
            graph.simulation_transient_voltage_graph_id,
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })

    groupChildren.push({
      name: "rect",
      type: "element",
      attributes: {
        class: "graph-area",
        x: formatNumber(chartLeft),
        y: formatNumber(areaTop + TITLE_HEIGHT),
        width: formatNumber(chartWidth),
        height: formatNumber(perGraphHeight - TITLE_HEIGHT),
        rx: "12",
        ry: "12",
      },
      children: [],
      value: "",
    })

    for (let iTick = 0; iTick <= Y_TICK_COUNT; iTick++) {
      const ratio = iTick / Y_TICK_COUNT
      const y = innerBottom - ratio * chartHeight
      const value = minVoltage + ratio * voltageRange

      groupChildren.push({
        name: "line",
        type: "element",
        attributes: {
          class: "grid-line",
          x1: formatNumber(chartLeft),
          y1: formatNumber(y),
          x2: formatNumber(chartRight),
          y2: formatNumber(y),
        },
        children: [],
        value: "",
      })

      groupChildren.push({
        name: "text",
        type: "element",
        attributes: {
          x: formatNumber(chartLeft - 16),
          y: formatNumber(y),
          class: "tick-label",
          "text-anchor": "end",
          "dominant-baseline": "middle",
        },
        children: [
          {
            type: "text",
            name: "",
            value: formatVoltage(value),
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }

    for (let iTick = 0; iTick <= X_TICK_COUNT; iTick++) {
      const ratio = iTick / X_TICK_COUNT
      const x = chartLeft + ratio * chartWidth
      const value = minTime + ratio * timeRange

      groupChildren.push({
        name: "text",
        type: "element",
        attributes: {
          x: formatNumber(x),
          y: formatNumber(innerBottom + 28),
          class: "tick-label",
          "text-anchor": "middle",
          "dominant-baseline": "hanging",
        },
        children: [
          {
            type: "text",
            name: "",
            value: formatTimeMs(value),
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }

    groupChildren.push({
      name: "line",
      type: "element",
      attributes: {
        class: "axis",
        x1: formatNumber(chartLeft),
        y1: formatNumber(innerBottom),
        x2: formatNumber(chartRight),
        y2: formatNumber(innerBottom),
      },
      children: [],
      value: "",
    })

    groupChildren.push({
      name: "line",
      type: "element",
      attributes: {
        class: "axis",
        x1: formatNumber(chartLeft),
        y1: formatNumber(innerTop),
        x2: formatNumber(chartLeft),
        y2: formatNumber(innerBottom),
      },
      children: [],
      value: "",
    })

    if (sortedPairs.length > 0) {
      const pathD = sortedPairs
        .map((pair, i) => {
          const x = chartLeft + ((pair.t - minTime) / timeRange) * chartWidth
          const y =
            innerBottom - ((pair.v - minVoltage) / voltageRange) * chartHeight
          return `${i === 0 ? "M" : "L"} ${formatNumber(x)} ${formatNumber(y)}`
        })
        .join(" ")

      groupChildren.push({
        name: "path",
        type: "element",
        attributes: {
          class: "voltage-path",
          d: pathD,
          "clip-path": `url(#${clipId})`,
          "data-simulation-transient-voltage-graph-id":
            graph.simulation_transient_voltage_graph_id,
          ...(graph.schematic_voltage_probe_id
            ? {
                "data-schematic-voltage-probe-id":
                  graph.schematic_voltage_probe_id,
              }
            : {}),
        },
        children: [],
        value: "",
      })
    } else {
      groupChildren.push({
        name: "text",
        type: "element",
        attributes: {
          x: formatNumber((chartLeft + chartRight) / 2),
          y: formatNumber((innerTop + innerBottom) / 2),
          class: "no-data",
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        },
        children: [
          {
            type: "text",
            name: "",
            value: "No data",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }

    svgChildren.push({
      name: "g",
      type: "element",
      attributes: {
        class: "simulation-graph",
        "data-simulation-transient-voltage-graph-id":
          graph.simulation_transient_voltage_graph_id,
        ...(graph.schematic_voltage_probe_id
          ? {
              "data-schematic-voltage-probe-id":
                graph.schematic_voltage_probe_id,
            }
          : {}),
      },
      children: groupChildren,
      value: "",
    })
  })

  if (defsChildren.length > 0) {
    svgChildren.splice(1, 0, {
      name: "defs",
      type: "element",
      attributes: {},
      children: defsChildren,
      value: "",
    })
  }

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: width.toString(),
      height: height.toString(),
      viewBox: `0 0 ${width} ${height}`,
      style: `background-color: ${defaultColorMap.schematic.background}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...(experiment?.name
        ? { "data-simulation-experiment-name": experiment.name }
        : {}),
      ...(experiment?.experiment_type
        ? {
            "data-simulation-experiment-type": experiment.experiment_type,
          }
        : {}),
    },
    children: svgChildren,
  }

  return stringify(svgObject)
}

function extractDimensions(svg: string): { width: number; height: number } {
  const widthMatch = svg.match(/width="([0-9.]+)"/)
  const heightMatch = svg.match(/height="([0-9.]+)"/)
  if (!widthMatch || !heightMatch) {
    throw new Error("Unable to determine SVG dimensions")
  }
  return {
    width: Number.parseFloat(widthMatch[1]!),
    height: Number.parseFloat(heightMatch[1]!),
  }
}

function positionSvg(svg: string, x: number, y: number): string {
  const trimmed = svg.trim()
  if (!trimmed.startsWith("<svg")) {
    throw new Error("Expected SVG markup")
  }
  const insert = `x=\"${formatNumber(x)}\" y=\"${formatNumber(y)}\" `
  return trimmed.replace("<svg ", `<svg ${insert}`)
}

interface ConvertSchematicAndSimulationArgs {
  circuitJson: AnyCircuitElement[]
  simulation_experiment_id: string
  orientation?: "simulation_on_bottom"
  schematicOptions?: Parameters<typeof convertCircuitJsonToSchematicSvg>[1]
  simulationOptions?: Omit<
    ConvertSimulationGraphArgs,
    "circuitJson" | "simulation_experiment_id"
  >
}

export function convertCircuitJsonToSchematicAndSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  orientation = "simulation_on_bottom",
  schematicOptions,
  simulationOptions,
}: ConvertSchematicAndSimulationArgs): string {
  if (orientation !== "simulation_on_bottom") {
    throw new Error(`Unsupported orientation: ${orientation}`)
  }

  const schematicSvg = convertCircuitJsonToSchematicSvg(
    circuitJson,
    schematicOptions,
  )

  const simulationSvg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id,
    ...simulationOptions,
  })

  const schematicDims = extractDimensions(schematicSvg)
  const simulationDims = extractDimensions(simulationSvg)

  const combinedWidth = Math.max(schematicDims.width, simulationDims.width)
  const combinedHeight = schematicDims.height + simulationDims.height

  const schematicOffsetX = (combinedWidth - schematicDims.width) / 2
  const simulationOffsetX = (combinedWidth - simulationDims.width) / 2

  const positionedSchematic = positionSvg(
    schematicSvg,
    Math.max(0, schematicOffsetX),
    0,
  )
  const positionedSimulation = positionSvg(
    simulationSvg,
    Math.max(0, simulationOffsetX),
    schematicDims.height,
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(
    combinedWidth,
  )}" height="${formatNumber(combinedHeight)}" viewBox="0 0 ${formatNumber(
    combinedWidth,
  )} ${formatNumber(combinedHeight)}">${positionedSchematic}${positionedSimulation}</svg>`
}
