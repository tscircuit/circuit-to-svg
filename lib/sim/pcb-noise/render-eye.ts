import { stringifySvg } from "../../utils/stringify-svg"
import type { SimulationPcbNoiseEyeJson } from "circuit-json"
import { createAxes } from "../simulation-graph-svg/create-axes"
import { createBackgroundRect } from "../simulation-graph-svg/create-axes/create-background-rect"
import { createGridLines } from "../simulation-graph-svg/create-axes/create-grid-lines"
import { createLinearScale } from "../simulation-graph-svg/create-axes/create-linear-scale"
import { createPlotBackground } from "../simulation-graph-svg/create-axes/create-plot-background"
import { createStyleNode } from "../simulation-graph-svg/create-axes/create-style-node"
import {
  MARGIN,
  formatNumber,
  svgElement,
  textNode,
} from "../simulation-graph-svg/simulation-graph-svg-shared"

/** The density is already analyzed and validated. Rendering never realigns transitions. */
export function renderNoiseEye(
  eye: SimulationPcbNoiseEyeJson,
  title: string,
  timingLabel: string,
  width: number,
  height: number,
): string {
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const xMin = -eye.extent_ui / 2
  const xMax = eye.extent_ui / 2
  const timeAxis = {
    domainMin: xMin,
    domainMax: xMax,
    ticks: [xMin, (xMin + xMax) / 2, xMax],
  }
  const valueAxis = {
    domainMin: eye.min_voltage_v,
    domainMax: eye.max_voltage_v,
    ticks: [
      eye.min_voltage_v,
      (eye.min_voltage_v + eye.max_voltage_v) / 2,
      eye.max_voltage_v,
    ],
  }
  const scaleX = createLinearScale(
    xMin,
    xMax,
    MARGIN.left,
    MARGIN.left + plotWidth,
  )
  const scaleY = createLinearScale(
    eye.min_voltage_v,
    eye.max_voltage_v,
    MARGIN.top + plotHeight,
    MARGIN.top,
  )
  let maximum = 0
  for (const count of eye.counts) maximum = Math.max(maximum, count)
  const paths = Array.from({ length: 16 }, () => [] as string[])
  const cellWidth = formatNumber(plotWidth / eye.time_bins)
  const cellHeight = formatNumber(plotHeight / eye.voltage_bins)
  eye.counts.forEach((count, index) => {
    if (count === 0) return
    const column = index % eye.time_bins
    const row = Math.floor(index / eye.time_bins)
    const x = formatNumber(MARGIN.left + (column / eye.time_bins) * plotWidth)
    const y = formatNumber(
      MARGIN.top +
        ((eye.voltage_bins - row - 1) / eye.voltage_bins) * plotHeight,
    )
    const level = Math.min(15, Math.ceil(Math.sqrt(count / maximum) * 16) - 1)
    paths[level]!.push(`M${x} ${y}h${cellWidth}v${cellHeight}h-${cellWidth}z`)
  })
  const bins = paths.flatMap((commands, level) =>
    commands.length
      ? [
          svgElement("path", {
            d: commands.join(" "),
            fill: "#147db3",
            opacity: formatNumber((level + 1) / 16),
          }),
        ]
      : [],
  )
  const label = (value: string, y: number, className: string) =>
    svgElement(
      "text",
      {
        x: String(width / 2),
        y: String(y),
        "text-anchor": "middle",
        class: className,
      },
      [textNode(value)],
    )
  return stringifySvg(
    svgElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: String(width),
        height: String(height),
        viewBox: `0 0 ${width} ${height}`,
        "data-type": "simulation_pcb_noise_eye",
      },
      [
        createStyleNode(),
        createBackgroundRect(width, height),
        createPlotBackground(MARGIN.left, plotWidth, plotHeight),
        svgElement(
          "g",
          {
            "data-density-order": "voltage-major",
            "data-display-scale": "sqrt-relative-occupancy-16-levels",
          },
          bins,
        ),
        createGridLines({
          timeAxis,
          valueAxis,
          scaleX,
          scaleY,
          plotLeft: MARGIN.left,
          plotWidth,
          plotHeight,
        }),
        createAxes({
          timeAxis,
          valueAxis,
          graphs: [],
          scaleX,
          scaleY,
          plotLeft: MARGIN.left,
          plotWidth,
          plotHeight,
          yAxisTitle: "Voltage (V)",
          xAxisTitle: "Time / UI",
          usesScopeTraceDisplay: false,
        }),
        label(title, 22, "chart-title"),
        label(
          `${timingLabel} · UI ${formatNumber(eye.unit_interval_s * 1e12)} ps`,
          45,
          "legend-label",
        ),
        label(
          "Relative occupancy · 16 levels in square-root display · finite record",
          height - 12,
          "legend-label",
        ),
      ],
    ),
  )
}
