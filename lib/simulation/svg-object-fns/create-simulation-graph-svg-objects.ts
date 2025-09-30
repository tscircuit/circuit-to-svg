import { type INode as SvgObject } from "svgson"

export interface SimulationGraphPoint {
  timeMs: number
  voltage: number
}

export interface SimulationGraphLineDefinition {
  id: string
  name: string
  color: string
  points: SimulationGraphPoint[]
}

export interface CreateSimulationGraphSvgObjectsOptions {
  width: number
  height: number
  experimentName: string
  xLabel: string
  yLabel: string
  lines: SimulationGraphLineDefinition[]
}

interface Ranges {
  minTime: number
  maxTime: number
  minVoltage: number
  maxVoltage: number
}

const DEFAULT_MARGIN = {
  top: 90,
  right: 48,
  bottom: 70,
  left: 90,
}

const AXIS_COLOR = "#374151"
const GRID_COLOR = "#E5E7EB"
const TITLE_COLOR = "#111827"
const LABEL_COLOR = "#1F2937"
const LEGEND_TEXT_COLOR = "#111827"

export function createSimulationGraphSvgObjects(
  options: CreateSimulationGraphSvgObjectsOptions,
): SvgObject[] {
  const { width, height, experimentName, xLabel, yLabel, lines } = options

  const filteredLines = lines.filter((line) => line.points.length > 0)
  if (filteredLines.length === 0) {
    return [
      createTitle({ width, text: experimentName }),
      createNoDataMessage({ width, height }),
    ]
  }

  const ranges = computeRanges(filteredLines)
  const margin = DEFAULT_MARGIN
  const chartWidth = Math.max(width - margin.left - margin.right, 10)
  const chartHeight = Math.max(height - margin.top - margin.bottom, 10)
  const xAxisY = height - margin.bottom
  const yAxisX = margin.left

  const axisObjects = createAxes({
    width,
    height,
    chartWidth,
    chartHeight,
    xAxisY,
    yAxisX,
    ranges,
  })

  const gridObjects = createGridLines({
    chartWidth,
    chartHeight,
    xAxisY,
    yAxisX,
    ranges,
  })

  const lineObjects = filteredLines.flatMap((line) =>
    createLineObjects({
      line,
      ranges,
      chartWidth,
      chartHeight,
      margin,
    }),
  )

  const legendObjects = createLegend({
    lines: filteredLines,
    margin,
  })

  const axisLabelObjects = createAxisLabels({
    width,
    height,
    margin,
    xLabel,
    yLabel,
  })

  return [
    createTitle({ width, text: experimentName }),
    ...gridObjects,
    ...axisObjects,
    ...axisLabelObjects,
    ...lineObjects,
    ...legendObjects,
  ]
}

function createTitle({
  width,
  text,
}: {
  width: number
  text: string
}): SvgObject {
  return {
    name: "text",
    type: "element",
    attributes: {
      x: (width / 2).toFixed(2),
      y: "40",
      fill: TITLE_COLOR,
      "text-anchor": "middle",
      "font-size": "20",
      "font-weight": "600",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: text,
  }
}

function createNoDataMessage({
  width,
  height,
}: {
  width: number
  height: number
}): SvgObject {
  return {
    name: "text",
    type: "element",
    attributes: {
      x: (width / 2).toFixed(2),
      y: (height / 2).toFixed(2),
      fill: LABEL_COLOR,
      "text-anchor": "middle",
      "font-size": "16",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: "No simulation data available",
  }
}

function computeRanges(lines: SimulationGraphLineDefinition[]): Ranges {
  const times = lines.flatMap((line) =>
    line.points.map((point) => point.timeMs),
  )
  const voltages = lines.flatMap((line) =>
    line.points.map((point) => point.voltage),
  )

  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const minVoltage = Math.min(...voltages)
  const maxVoltage = Math.max(...voltages)

  const safeMinTime = Number.isFinite(minTime) ? minTime : 0
  const safeMaxTime = Number.isFinite(maxTime) ? maxTime : safeMinTime + 1
  const safeMinVoltage = Number.isFinite(minVoltage) ? minVoltage : 0
  const safeMaxVoltage = Number.isFinite(maxVoltage)
    ? maxVoltage
    : safeMinVoltage + 1

  return {
    minTime: safeMinTime,
    maxTime: safeMaxTime === safeMinTime ? safeMinTime + 1 : safeMaxTime,
    minVoltage: safeMinVoltage,
    maxVoltage:
      safeMaxVoltage === safeMinVoltage ? safeMinVoltage + 1 : safeMaxVoltage,
  }
}

function createAxes({
  width,
  height,
  chartWidth,
  chartHeight,
  xAxisY,
  yAxisX,
  ranges,
}: {
  width: number
  height: number
  chartWidth: number
  chartHeight: number
  xAxisY: number
  yAxisX: number
  ranges: Ranges
}): SvgObject[] {
  const axisStrokeWidth = "1.5"
  const xAxis: SvgObject = {
    name: "line",
    type: "element",
    attributes: {
      x1: yAxisX.toFixed(2),
      y1: xAxisY.toFixed(2),
      x2: (yAxisX + chartWidth).toFixed(2),
      y2: xAxisY.toFixed(2),
      stroke: AXIS_COLOR,
      "stroke-width": axisStrokeWidth,
    } as Record<string, string>,
    children: [],
    value: "",
  }

  const yAxis: SvgObject = {
    name: "line",
    type: "element",
    attributes: {
      x1: yAxisX.toFixed(2),
      y1: (xAxisY - chartHeight).toFixed(2),
      x2: yAxisX.toFixed(2),
      y2: xAxisY.toFixed(2),
      stroke: AXIS_COLOR,
      "stroke-width": axisStrokeWidth,
    } as Record<string, string>,
    children: [],
    value: "",
  }

  const xTicks = createTicks(ranges.minTime, ranges.maxTime, 6)
  const yTicks = createTicks(ranges.minVoltage, ranges.maxVoltage, 6)

  const xTickObjects = xTicks.flatMap((tick) =>
    createXAxisTick({
      tick,
      ranges,
      chartWidth,
      xAxisY,
      yAxisX,
    }),
  )

  const yTickObjects = yTicks.flatMap((tick) =>
    createYAxisTick({
      tick,
      ranges,
      chartHeight,
      xAxisY,
      yAxisX,
    }),
  )

  return [xAxis, yAxis, ...xTickObjects, ...yTickObjects]
}

function createAxisLabels({
  width,
  height,
  margin,
  xLabel,
  yLabel,
}: {
  width: number
  height: number
  margin: typeof DEFAULT_MARGIN
  xLabel: string
  yLabel: string
}): SvgObject[] {
  const xLabelText: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: (width / 2).toFixed(2),
      y: (height - margin.bottom / 3).toFixed(2),
      fill: LABEL_COLOR,
      "text-anchor": "middle",
      "font-size": "14",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: xLabel,
  }

  const yLabelX = margin.left / 3
  const yLabelY = height / 2

  const yLabelText: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      transform: `rotate(-90 ${yLabelX.toFixed(2)} ${yLabelY.toFixed(2)})`,
      x: yLabelX.toFixed(2),
      y: yLabelY.toFixed(2),
      fill: LABEL_COLOR,
      "text-anchor": "middle",
      "font-size": "14",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: yLabel,
  }

  return [xLabelText, yLabelText]
}

function createGridLines({
  chartWidth,
  chartHeight,
  xAxisY,
  yAxisX,
  ranges,
}: {
  chartWidth: number
  chartHeight: number
  xAxisY: number
  yAxisX: number
  ranges: Ranges
}): SvgObject[] {
  const xTicks = createTicks(ranges.minTime, ranges.maxTime, 6)
  const yTicks = createTicks(ranges.minVoltage, ranges.maxVoltage, 6)

  const verticalLines = xTicks.map((tick) => {
    const ratio = getRatio(tick, ranges.minTime, ranges.maxTime)
    const x = yAxisX + ratio * chartWidth
    return {
      name: "line",
      type: "element",
      attributes: {
        x1: x.toFixed(2),
        y1: (xAxisY - chartHeight).toFixed(2),
        x2: x.toFixed(2),
        y2: xAxisY.toFixed(2),
        stroke: GRID_COLOR,
        "stroke-width": "1",
        "stroke-dasharray": "4 4",
      } as Record<string, string>,
      children: [],
      value: "",
    }
  })

  const horizontalLines = yTicks.map((tick) => {
    const ratio = getRatio(tick, ranges.minVoltage, ranges.maxVoltage)
    const y = xAxisY - ratio * chartHeight
    return {
      name: "line",
      type: "element",
      attributes: {
        x1: yAxisX.toFixed(2),
        y1: y.toFixed(2),
        x2: (yAxisX + chartWidth).toFixed(2),
        y2: y.toFixed(2),
        stroke: GRID_COLOR,
        "stroke-width": "1",
        "stroke-dasharray": "4 4",
      } as Record<string, string>,
      children: [],
      value: "",
    }
  })

  return [...verticalLines, ...horizontalLines]
}

function createLineObjects({
  line,
  ranges,
  chartWidth,
  chartHeight,
  margin,
}: {
  line: SimulationGraphLineDefinition
  ranges: Ranges
  chartWidth: number
  chartHeight: number
  margin: typeof DEFAULT_MARGIN
}): SvgObject[] {
  const path = line.points
    .map((point, index) => {
      const x =
        margin.left +
        getRatio(point.timeMs, ranges.minTime, ranges.maxTime) * chartWidth
      const y =
        margin.top +
        (1 - getRatio(point.voltage, ranges.minVoltage, ranges.maxVoltage)) *
          chartHeight
      const command = index === 0 ? "M" : "L"
      return `${command}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")

  const pathObject: SvgObject = {
    name: "path",
    type: "element",
    attributes: {
      d: path,
      fill: "none",
      stroke: line.color,
      "stroke-width": "2.5",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    } as Record<string, string>,
    children: [],
    value: "",
  }

  return [pathObject]
}

function createLegend({
  lines,
  margin,
}: {
  lines: SimulationGraphLineDefinition[]
  margin: typeof DEFAULT_MARGIN
}): SvgObject[] {
  const legendX = margin.left
  const legendY = margin.top - 40
  const entryHeight = 22

  return lines.map((line, index) => {
    const y = legendY + index * entryHeight
    return {
      name: "g",
      type: "element",
      attributes: {} as Record<string, string>,
      children: [
        {
          name: "line",
          type: "element",
          attributes: {
            x1: legendX.toFixed(2),
            y1: y.toFixed(2),
            x2: (legendX + 24).toFixed(2),
            y2: y.toFixed(2),
            stroke: line.color,
            "stroke-width": "3",
            "stroke-linecap": "round",
          } as Record<string, string>,
          children: [],
          value: "",
        },
        {
          name: "text",
          type: "element",
          attributes: {
            x: (legendX + 32).toFixed(2),
            y: (y + 4).toFixed(2),
            fill: LEGEND_TEXT_COLOR,
            "font-size": "13",
            "font-family": "Inter, system-ui, sans-serif",
          } as Record<string, string>,
          children: [],
          value: line.name,
        },
      ],
      value: "",
    }
  })
}

function createXAxisTick({
  tick,
  ranges,
  chartWidth,
  xAxisY,
  yAxisX,
}: {
  tick: number
  ranges: Ranges
  chartWidth: number
  xAxisY: number
  yAxisX: number
}): SvgObject[] {
  const ratio = getRatio(tick, ranges.minTime, ranges.maxTime)
  const x = yAxisX + ratio * chartWidth

  const lineObject: SvgObject = {
    name: "line",
    type: "element",
    attributes: {
      x1: x.toFixed(2),
      y1: xAxisY.toFixed(2),
      x2: x.toFixed(2),
      y2: (xAxisY + 6).toFixed(2),
      stroke: AXIS_COLOR,
      "stroke-width": "1",
    } as Record<string, string>,
    children: [],
    value: "",
  }

  const textObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: x.toFixed(2),
      y: (xAxisY + 20).toFixed(2),
      fill: LABEL_COLOR,
      "text-anchor": "middle",
      "font-size": "12",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: formatTickValue(tick),
  }

  return [lineObject, textObject]
}

function createYAxisTick({
  tick,
  ranges,
  chartHeight,
  xAxisY,
  yAxisX,
}: {
  tick: number
  ranges: Ranges
  chartHeight: number
  xAxisY: number
  yAxisX: number
}): SvgObject[] {
  const ratio = getRatio(tick, ranges.minVoltage, ranges.maxVoltage)
  const y = xAxisY - ratio * chartHeight

  const lineObject: SvgObject = {
    name: "line",
    type: "element",
    attributes: {
      x1: (yAxisX - 6).toFixed(2),
      y1: y.toFixed(2),
      x2: yAxisX.toFixed(2),
      y2: y.toFixed(2),
      stroke: AXIS_COLOR,
      "stroke-width": "1",
    } as Record<string, string>,
    children: [],
    value: "",
  }

  const textObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: (yAxisX - 10).toFixed(2),
      y: (y + 4).toFixed(2),
      fill: LABEL_COLOR,
      "text-anchor": "end",
      "font-size": "12",
      "font-family": "Inter, system-ui, sans-serif",
    } as Record<string, string>,
    children: [],
    value: formatTickValue(tick),
  }

  return [lineObject, textObject]
}

function createTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count <= 1) {
    return [min]
  }

  const range = max - min
  if (range === 0) {
    return [min]
  }

  const step = range / (count - 1)
  return Array.from({ length: count }, (_, index) => min + step * index)
}

function getRatio(value: number, min: number, max: number): number {
  if (max === min) {
    return 0
  }
  return (value - min) / (max - min)
}

function formatTickValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0"
  }

  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(2)
  }

  if (Math.abs(value - Math.round(value)) < 1e-6) {
    return Math.round(value).toString()
  }

  return value.toFixed(2)
}
