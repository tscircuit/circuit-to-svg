import type { SvgObject } from "lib/svg-object"
import { createScopeValueAxes } from "./create-axes/create-scope-value-axes"
import { formatTickLabel } from "./format-value-with-unit"
import {
  type AxisInfo,
  MARGIN,
  type PreparedSimulationGraph,
  type ScaleFn,
  formatNumber,
  svgElement,
  textNode,
} from "./simulation-graph-svg-shared"

interface AxesOptions {
  timeAxis: AxisInfo
  valueAxis: AxisInfo
  graphs: PreparedSimulationGraph[]
  scaleX: ScaleFn
  scaleY: ScaleFn
  plotLeft: number
  plotWidth: number
  plotHeight: number
  yAxisTitle: string
  xAxisTitle: string
  usesScopeTraceDisplay: boolean
}

export function createAxes({
  timeAxis,
  valueAxis,
  graphs,
  scaleX,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight,
  yAxisTitle,
  xAxisTitle,
  usesScopeTraceDisplay,
}: AxesOptions): SvgObject {
  const bottom = MARGIN.top + plotHeight
  const left = plotLeft
  const right = plotLeft + plotWidth

  const children: SvgObject[] = [
    svgElement("line", {
      class: "axis axis-x",
      x1: formatNumber(left),
      y1: formatNumber(bottom),
      x2: formatNumber(right),
      y2: formatNumber(bottom),
    }),
    ...(usesScopeTraceDisplay
      ? []
      : [
          svgElement("line", {
            class: "axis axis-y",
            x1: formatNumber(left),
            y1: formatNumber(MARGIN.top),
            x2: formatNumber(left),
            y2: formatNumber(bottom),
          }),
        ]),
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
      svgElement(
        "text",
        {
          class: "axis-label axis-label-x",
          x,
          y: formatNumber(bottom + 22),
          "text-anchor": "middle",
        },
        [textNode(formatTickLabel(tick, timeAxis))],
      ),
    )
  }

  if (usesScopeTraceDisplay) {
    children.push(
      ...createScopeValueAxes({
        graphs,
        valueAxis,
        scaleY,
        plotLeft,
        plotWidth,
        plotHeight,
      }),
    )
  } else {
    for (const tick of valueAxis.ticks) {
      const y = formatNumber(scaleY(tick))
      children.push(
        svgElement("line", {
          class: "axis-tick axis-tick-y",
          x1: formatNumber(left - 6),
          y1: y,
          x2: formatNumber(left),
          y2: y,
        }),
        svgElement(
          "text",
          {
            class: "axis-label axis-label-y",
            x: formatNumber(left - 10),
            y,
            "text-anchor": "end",
            "dominant-baseline": "middle",
          },
          [textNode(formatTickLabel(tick, valueAxis))],
        ),
      )
    }

    children.push(
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
        [textNode(yAxisTitle)],
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
      [textNode(xAxisTitle)],
    ),
  )

  return svgElement("g", { class: "axes" }, children)
}
