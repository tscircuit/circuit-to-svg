import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap as defaultColorMap } from "lib/utils/colors"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { stringify } from "svgson"

const defaultPadding = {
  top: 64,
  right: 72,
  bottom: 80,
  left: 100,
} as const

const titleHeight = 28
const xAxisLabelHeight = 28
const minimumChartHeight = 120

export interface ConvertCircuitJsonToSimulationGraphSvgArgs {
  circuitJson: AnyCircuitElement[]
  simulation_experiment_id: string
  width?: number
  heightPerGraph?: number
  graphGap?: number
  padding?: Partial<typeof defaultPadding>
  includeVersion?: boolean
}

interface DataPoint {
  time: number
  voltage: number
}

interface ComputedGraphData {
  dataPoints: DataPoint[]
  minTime: number
  maxTime: number
  minVoltage: number
  maxVoltage: number
}

const sanitizeId = (value: string, fallback: string) => {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "_")
  return sanitized.length > 0 ? sanitized : fallback
}

const trimNumber = (value: number) =>
  Number.isFinite(value) ? Number(value.toPrecision(8)) : value

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return ""
  }

  const abs = Math.abs(value)

  if (abs >= 1000) {
    return Math.round(value).toString()
  }

  if (abs >= 1) {
    return Number(value.toFixed(2)).toString()
  }

  if (abs >= 0.01) {
    return Number(value.toFixed(3)).toString()
  }

  return value.toExponential(2)
}

const generateTicks = (
  min: number,
  max: number,
  desiredCount: number,
): number[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return []
  }

  if (desiredCount < 2) {
    return [min, max]
  }

  if (min === max) {
    const offset = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1
    min -= offset
    max += offset
  }

  const step = (max - min) / (desiredCount - 1)
  if (!Number.isFinite(step) || step === 0) {
    return [min, max]
  }

  const ticks: number[] = []
  for (let index = 0; index < desiredCount; index++) {
    ticks.push(trimNumber(min + step * index))
  }

  return ticks
}

const resolveGraphData = (
  graph: SimulationTransientVoltageGraph,
): ComputedGraphData => {
  const { voltage_levels: voltageLevels, timestamps_ms: timestamps } = graph

  if (!voltageLevels?.length) {
    return {
      dataPoints: [],
      minTime: graph.start_time_ms,
      maxTime: graph.end_time_ms,
      minVoltage: 0,
      maxVoltage: 0,
    }
  }

  const values: DataPoint[] = []

  if (Array.isArray(timestamps) && timestamps.length) {
    const length = Math.min(timestamps.length, voltageLevels.length)
    for (let index = 0; index < length; index++) {
      values.push({
        time: timestamps[index]!,
        voltage: voltageLevels[index]!,
      })
    }
  } else {
    for (let index = 0; index < voltageLevels.length; index++) {
      const time = graph.start_time_ms + graph.time_per_step * index
      values.push({
        time,
        voltage: voltageLevels[index]!,
      })
    }
  }

  let minTime = Number.POSITIVE_INFINITY
  let maxTime = Number.NEGATIVE_INFINITY
  let minVoltage = Number.POSITIVE_INFINITY
  let maxVoltage = Number.NEGATIVE_INFINITY

  for (const point of values) {
    if (point.time < minTime) minTime = point.time
    if (point.time > maxTime) maxTime = point.time
    if (point.voltage < minVoltage) minVoltage = point.voltage
    if (point.voltage > maxVoltage) maxVoltage = point.voltage
  }

  if (!Number.isFinite(minTime)) {
    minTime = graph.start_time_ms
  }
  if (!Number.isFinite(maxTime)) {
    maxTime = graph.end_time_ms
  }
  if (minTime === maxTime) {
    const offset = Math.abs(minTime) > 0 ? Math.abs(minTime) * 0.1 : 1
    minTime -= offset
    maxTime += offset
  }

  if (!Number.isFinite(minVoltage)) {
    minVoltage = 0
  }
  if (!Number.isFinite(maxVoltage)) {
    maxVoltage = 0
  }
  if (minVoltage === maxVoltage) {
    const offset = Math.abs(minVoltage) > 0 ? Math.abs(minVoltage) * 0.1 : 1
    minVoltage -= offset
    maxVoltage += offset
  }

  return {
    dataPoints: values,
    minTime,
    maxTime,
    minVoltage,
    maxVoltage,
  }
}

const createTextNode = (value: string): SvgObject => ({
  type: "text",
  value,
  name: "",
  attributes: {},
  children: [],
})

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  width = 1200,
  heightPerGraph = 280,
  graphGap = 48,
  padding: paddingOverrides,
  includeVersion,
}: ConvertCircuitJsonToSimulationGraphSvgArgs): string {
  const padding = {
    ...defaultPadding,
    ...(paddingOverrides ?? {}),
  }

  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      element.type === "simulation_experiment" &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const graphs = circuitJson.filter(
    (element): element is SimulationTransientVoltageGraph =>
      element.type === "simulation_transient_voltage_graph" &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const colorMap = defaultColorMap
  const lineColors = colorMap.palette
  const softwareUsedString = getSoftwareUsedString(circuitJson)
  const version = CIRCUIT_TO_SVG_VERSION

  const resolvedChartHeight = Math.max(
    heightPerGraph - titleHeight - xAxisLabelHeight,
    minimumChartHeight,
  )
  const graphHeight = resolvedChartHeight + titleHeight + xAxisLabelHeight
  const gap = graphs.length > 1 ? graphGap : 0

  const innerWidth = Math.max(width - padding.left - padding.right, 1)

  const headerHeight = experiment ? 48 : 0
  const graphsHeight = graphs.length
    ? graphs.length * graphHeight + (graphs.length - 1) * gap
    : 0
  const contentStartY = padding.top + headerHeight

  const baseHeight = padding.top + headerHeight + graphsHeight + padding.bottom
  const height = Math.max(baseHeight, padding.top + padding.bottom + 200)

  const svgChildren: SvgObject[] = []
  const defsChildren: SvgObject[] = []

  svgChildren.push({
    name: "style",
    type: "element",
    attributes: {},
    value: "",
    children: [
      createTextNode(`
        .simulation-svg-root { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; }
        .simulation-svg-background { fill: ${colorMap.schematic.background}; }
        .simulation-graph-background {
          fill: rgba(255, 255, 255, 0.92);
          stroke: ${colorMap.schematic.grid};
          stroke-width: 1.5;
        }
        .simulation-graph-title {
          fill: ${colorMap.schematic.reference};
          font-size: 18px;
          font-weight: 600;
        }
        .simulation-axis-line {
          stroke: ${colorMap.schematic.grid_axes};
          stroke-width: 1.5;
        }
        .simulation-grid-line {
          stroke: ${colorMap.schematic.grid};
          stroke-width: 1;
          stroke-dasharray: 6 6;
        }
        .simulation-tick-label {
          fill: ${colorMap.schematic.label_local};
          font-size: 14px;
        }
        .simulation-axis-label {
          fill: ${colorMap.schematic.label_local};
          font-size: 14px;
          font-weight: 500;
        }
        .simulation-graph-line {
          fill: none;
          stroke-width: 2.5;
          stroke-linejoin: round;
          stroke-linecap: round;
        }
        .simulation-empty-message {
          fill: ${colorMap.schematic.label_local};
          font-size: 18px;
          text-anchor: middle;
        }
        .simulation-experiment-name {
          fill: ${colorMap.schematic.reference};
          font-size: 22px;
          font-weight: 600;
        }
        .simulation-experiment-type {
          fill: ${colorMap.schematic.label_local};
          font-size: 16px;
        }
      `),
    ],
  })

  svgChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "simulation-svg-background",
      x: "0",
      y: "0",
      width: width.toString(),
      height: height.toString(),
    },
    value: "",
    children: [],
  })

  if (experiment) {
    svgChildren.push({
      name: "g",
      type: "element",
      attributes: {
        class: "simulation-experiment-header",
        transform: `translate(${padding.left} ${padding.top})`,
        "data-simulation-experiment-id": experiment.simulation_experiment_id,
        "data-simulation-experiment-type": experiment.experiment_type,
      },
      value: "",
      children: [
        {
          name: "text",
          type: "element",
          attributes: {
            class: "simulation-experiment-name",
            x: "0",
            y: "0",
            "dominant-baseline": "hanging",
          },
          value: "",
          children: [createTextNode(experiment.name)],
        },
        {
          name: "text",
          type: "element",
          attributes: {
            class: "simulation-experiment-type",
            x: "0",
            y: "26",
            "dominant-baseline": "hanging",
          },
          value: "",
          children: [
            createTextNode(
              `Type: ${experiment.experiment_type.replace(/_/g, " ")}`,
            ),
          ],
        },
      ],
    })
  }

  graphs.forEach((graph, index) => {
    const color =
      lineColors[index % lineColors.length] ?? colorMap.schematic.wire
    const { dataPoints, minTime, maxTime, minVoltage, maxVoltage } =
      resolveGraphData(graph)

    const clipPathId = `simulation-graph-clip-${index}-${sanitizeId(
      graph.simulation_transient_voltage_graph_id,
      `${index}`,
    )}`

    const clipRect: SvgObject = {
      name: "rect",
      type: "element",
      attributes: {
        x: "0",
        y: titleHeight.toString(),
        width: innerWidth.toString(),
        height: resolvedChartHeight.toString(),
      },
      value: "",
      children: [],
    }

    defsChildren.push({
      name: "clipPath",
      type: "element",
      attributes: { id: clipPathId },
      value: "",
      children: [clipRect],
    })

    const groupChildren: SvgObject[] = []

    groupChildren.push({
      name: "rect",
      type: "element",
      attributes: {
        class: "simulation-graph-background",
        x: "0",
        y: "0",
        width: innerWidth.toString(),
        height: graphHeight.toString(),
        rx: "12",
        ry: "12",
      },
      value: "",
      children: [],
    })

    groupChildren.push({
      name: "text",
      type: "element",
      attributes: {
        class: "simulation-graph-title",
        x: "16",
        y: "12",
        "dominant-baseline": "hanging",
      },
      value: "",
      children: [
        createTextNode(
          graph.name ??
            graph.schematic_voltage_probe_id ??
            `Transient Voltage ${index + 1}`,
        ),
      ],
    })

    const chartOriginY = titleHeight
    const chartBottomY = chartOriginY + resolvedChartHeight

    const yTicks = generateTicks(minVoltage, maxVoltage, 6)
    const xTicks = generateTicks(minTime, maxTime, 6)

    yTicks.forEach((tick) => {
      const ratio = (tick - minVoltage) / (maxVoltage - minVoltage)
      const yPos = chartBottomY - ratio * resolvedChartHeight
      const yString = yPos.toString()

      groupChildren.push({
        name: "line",
        type: "element",
        attributes: {
          class: "simulation-grid-line",
          x1: "0",
          y1: yString,
          x2: innerWidth.toString(),
          y2: yString,
        },
        value: "",
        children: [],
      })

      groupChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "simulation-tick-label",
          x: "-12",
          y: yString,
          "text-anchor": "end",
          "dominant-baseline": "middle",
        },
        value: "",
        children: [createTextNode(formatNumber(tick))],
      })
    })

    xTicks.forEach((tick) => {
      const ratio = (tick - minTime) / (maxTime - minTime)
      const xPos = ratio * innerWidth
      const xString = xPos.toString()

      groupChildren.push({
        name: "line",
        type: "element",
        attributes: {
          class: "simulation-grid-line",
          x1: xString,
          y1: chartOriginY.toString(),
          x2: xString,
          y2: chartBottomY.toString(),
        },
        value: "",
        children: [],
      })

      groupChildren.push({
        name: "text",
        type: "element",
        attributes: {
          class: "simulation-tick-label",
          x: xString,
          y: (chartBottomY + 18).toString(),
          "text-anchor": "middle",
          "dominant-baseline": "hanging",
        },
        value: "",
        children: [createTextNode(formatNumber(tick))],
      })
    })

    groupChildren.push({
      name: "line",
      type: "element",
      attributes: {
        class: "simulation-axis-line",
        x1: "0",
        y1: chartBottomY.toString(),
        x2: innerWidth.toString(),
        y2: chartBottomY.toString(),
      },
      value: "",
      children: [],
    })

    groupChildren.push({
      name: "line",
      type: "element",
      attributes: {
        class: "simulation-axis-line",
        x1: "0",
        y1: chartOriginY.toString(),
        x2: "0",
        y2: chartBottomY.toString(),
      },
      value: "",
      children: [],
    })

    if (dataPoints.length) {
      const commands: string[] = []
      for (let pointIndex = 0; pointIndex < dataPoints.length; pointIndex++) {
        const point = dataPoints[pointIndex]!
        const timeRatio = (point.time - minTime) / (maxTime - minTime)
        const voltageRatio =
          (point.voltage - minVoltage) / (maxVoltage - minVoltage)
        const xPos = timeRatio * innerWidth
        const yPos = chartBottomY - voltageRatio * resolvedChartHeight
        commands.push(
          `${pointIndex === 0 ? "M" : "L"} ${xPos.toFixed(2)} ${yPos.toFixed(2)}`,
        )
      }

      groupChildren.push({
        name: "path",
        type: "element",
        attributes: {
          class: "simulation-graph-line",
          d: commands.join(" "),
          stroke: color,
          "clip-path": `url(#${clipPathId})`,
        },
        value: "",
        children: [],
      })
    }

    groupChildren.push({
      name: "text",
      type: "element",
      attributes: {
        class: "simulation-axis-label",
        x: (innerWidth / 2).toString(),
        y: (chartBottomY + xAxisLabelHeight - 6).toString(),
        "text-anchor": "middle",
        "dominant-baseline": "baseline",
      },
      value: "",
      children: [createTextNode("Time (ms)")],
    })

    svgChildren.push({
      name: "g",
      type: "element",
      attributes: {
        class: "simulation-transient-graph",
        transform: `translate(${padding.left} ${
          contentStartY + index * (graphHeight + gap)
        })`,
        "data-simulation-transient-voltage-graph-id":
          graph.simulation_transient_voltage_graph_id,
        "data-simulation-experiment-id": graph.simulation_experiment_id,
        "data-time-per-step-ms": graph.time_per_step.toString(),
        "data-start-time-ms": graph.start_time_ms.toString(),
        "data-end-time-ms": graph.end_time_ms.toString(),
        ...(graph.schematic_voltage_probe_id && {
          "data-schematic-voltage-probe-id": graph.schematic_voltage_probe_id,
        }),
        ...(graph.subcircuit_connecivity_map_key && {
          "data-subcircuit-connectivity-map-key":
            graph.subcircuit_connecivity_map_key,
        }),
      },
      value: "",
      children: groupChildren,
    })
  })

  if (defsChildren.length) {
    svgChildren.splice(1, 0, {
      name: "defs",
      type: "element",
      attributes: {},
      value: "",
      children: defsChildren,
    })
  }

  if (!graphs.length) {
    svgChildren.push({
      name: "text",
      type: "element",
      attributes: {
        class: "simulation-empty-message",
        x: (width / 2).toString(),
        y: (height / 2).toString(),
        "dominant-baseline": "middle",
      },
      value: "",
      children: [
        createTextNode(
          `No transient voltage graphs for experiment ${simulation_experiment_id}`,
        ),
      ],
    })
  }

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: width.toString(),
      height: height.toString(),
      viewBox: `0 0 ${width} ${height}`,
      class: "simulation-svg-root",
      "data-simulation-experiment-id": simulation_experiment_id,
      "data-simulation-graph-count": graphs.length.toString(),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    value: "",
    children: svgChildren,
  }

  return stringify(svgObject)
}

export default convertCircuitJsonToSimulationGraphSvg
