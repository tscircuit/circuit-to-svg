import {
  distance,
  getSimulationReturnCurrentGridJsonSchema,
  simulation_pcb_return_current_field,
  simulation_pcb_return_current_heatmap,
  simulation_pcb_return_current_marker,
  simulation_pcb_return_current_result,
  type AnyCircuitElement,
  type SimulationPcbReturnCurrentField,
  type SimulationReturnCurrentGridJson,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "../../svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSvgObjectsFromPcbTrace } from "../svg-object-fns/create-svg-objects-from-pcb-trace"
import { createSvgObjectsFromSmtPad } from "../svg-object-fns/create-svg-objects-from-smt-pads"
import { createSvgObjectsFromPcbVia } from "../svg-object-fns/create-svg-objects-from-pcb-via"
import type { PcbReturnCurrentOptions } from "./types"

const node = (
  name: string,
  attributes: Record<string, string>,
  children: SvgObject[] = [],
): SvgObject => ({ name, type: "element", value: "", attributes, children })
const text = (value: string, attributes: Record<string, string>): SvgObject =>
  node("text", attributes, [
    { name: "", type: "text", value, attributes: {}, children: [] },
  ])

/** Shared with the async loader: selecting a missing/empty result must not look like a successful simulation. */
export function getReturnCurrentResult(
  circuitJson: AnyCircuitElement[],
  resultId: string,
) {
  const results = circuitJson.filter(
    (el) =>
      el.type === "simulation_pcb_return_current_result" &&
      el.simulation_pcb_return_current_result_id === resultId,
  )
  if (results.length !== 1)
    throw new Error(`Expected one return-current result '${resultId}'`)
  const result = simulation_pcb_return_current_result.parse(results[0])
  if (
    !circuitJson.some(
      (el) =>
        el.type === "simulation_experiment" &&
        el.simulation_experiment_id === result.simulation_experiment_id &&
        el.experiment_type === "pcb_return_current",
    )
  )
    throw new Error(
      `Missing PCB return-current experiment '${result.simulation_experiment_id}'`,
    )
  if (
    !circuitJson.some(
      (el) =>
        el.type === "pcb_board" && el.pcb_board_id === result.pcb_board_id,
    )
  )
    throw new Error(`Missing PCB board '${result.pcb_board_id}'`)
  return result
}

function values(
  grid: SimulationReturnCurrentGridJson,
  i: number,
  phase: number,
) {
  if (grid.field_type === "real") {
    const x = grid.sheet_current_x[i]
    const y = grid.sheet_current_y[i]
    return x == null || y == null ? null : { x, y, magnitude: Math.hypot(x, y) }
  }
  const xr = grid.sheet_current_x_real[i]
  const xi = grid.sheet_current_x_imag[i]
  const yr = grid.sheet_current_y_real[i]
  const yi = grid.sheet_current_y_imag[i]
  if (xr == null || xi == null || yr == null || yi == null) return null
  return {
    x: xr * Math.cos(phase) - xi * Math.sin(phase),
    y: yr * Math.cos(phase) - yi * Math.sin(phase),
    magnitude: Math.hypot(xr, xi, yr, yi),
  }
}

const stops = [
  [30, 60, 130],
  [20, 170, 190],
  [90, 200, 140],
  [245, 210, 65],
  [220, 65, 45],
] as const
function color(t: number) {
  const index = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const lower = Math.floor(index)
  const a = stops[lower]!
  const b = stops[Math.min(lower + 1, stops.length - 1)]!
  return `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * (index - lower))).join(",")})`
}

export function createReturnCurrentSvgObjects({
  circuitJson,
  resultId,
  ctx,
  options = {},
  width,
  height,
}: {
  circuitJson: AnyCircuitElement[]
  resultId: string
  ctx: PcbContext
  options?: PcbReturnCurrentOptions
  width: number
  height: number
}): SvgObject[] {
  const result = getReturnCurrentResult(circuitJson, resultId)
  const opacity = options.opacity ?? 0.65
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error("Return-current opacity must be between 0 and 1")
  const phaseDegrees = options.phaseDegrees ?? 0
  if (!Number.isFinite(phaseDegrees))
    throw new Error("Return-current phaseDegrees must be finite")
  const range = options.densityRange
  if (
    range &&
    (!Number.isFinite(range.min) ||
      !Number.isFinite(range.max) ||
      range.min < 0 ||
      range.max <= range.min)
  )
    throw new Error("Return-current densityRange requires 0 <= min < max")

  const matches = (el: AnyCircuitElement) =>
    "simulation_pcb_return_current_result_id" in el &&
    el.simulation_pcb_return_current_result_id === resultId
  const heatmaps = circuitJson
    .filter(
      (el) =>
        el.type === "simulation_pcb_return_current_heatmap" && matches(el),
    )
    .map((el) => simulation_pcb_return_current_heatmap.parse(el))
    .filter((el) => !ctx.layer || el.layer === ctx.layer)
  const fields = circuitJson
    .filter(
      (el) => el.type === "simulation_pcb_return_current_field" && matches(el),
    )
    .map((el) => simulation_pcb_return_current_field.parse(el))
    .filter((el) => !ctx.layer || el.layer === ctx.layer)
  if (!fields.length && !heatmaps.length)
    throw new Error(
      `No return-current field or heatmap for '${resultId}' on ${ctx.layer ?? "any layer"}`,
    )
  const decoded = fields.flatMap((field) => {
    const data =
      options.fieldData?.[field.simulation_pcb_return_current_field_id]
    if (!data) return []
    return [
      {
        field,
        grid: getSimulationReturnCurrentGridJsonSchema(field).parse(data),
      },
    ]
  })
  if (!heatmaps.length && !decoded.length)
    throw new Error(
      "Return-current field assets need decoded fieldData; use convertCircuitJsonToPcbSimulationSvg to load assets",
    )

  let maximum = 0
  for (const { field, grid } of decoded)
    for (let i = 0; i < field.columns * field.rows; i++)
      maximum = Math.max(
        maximum,
        (values(grid, i, 0)?.magnitude ?? 0) / field.copper_thickness,
      )
  const minimum = range?.min ?? 0
  const upper = range?.max ?? (maximum || 1)
  const heat: SvgObject[] = []
  const vectors: SvgObject[] = []
  for (const heatmap of heatmaps) {
    if (
      range &&
      decoded.some(
        ({ field }) =>
          field.layer === heatmap.layer &&
          field.source_net_id === heatmap.source_net_id,
      )
    )
      continue
    const [left, top] = applyToPoint(ctx.transform, [
      heatmap.min_x,
      heatmap.max_y,
    ])
    const [right, bottom] = applyToPoint(ctx.transform, [
      heatmap.max_x,
      heatmap.min_y,
    ])
    heat.push(
      node("image", {
        x: String(left),
        y: String(top),
        width: String(right - left),
        height: String(bottom - top),
        href: heatmap.image_asset.url,
        preserveAspectRatio: "none",
        opacity: String(opacity),
        "data-type": heatmap.type,
        "data-pcb-layer": heatmap.layer,
        "data-source-net-id": heatmap.source_net_id,
        "data-units": "A/mm²",
      }),
    )
  }
  for (const { field, grid } of decoded) {
    const hasImage =
      !range &&
      heatmaps.some(
        (h) =>
          h.layer === field.layer && h.source_net_id === field.source_net_id,
      )
    renderGrid(field, grid, hasImage)
  }

  function renderGrid(
    field: SimulationPcbReturnCurrentField,
    grid: SimulationReturnCurrentGridJson,
    hasImage: boolean,
  ) {
    const stride = Math.max(
      1,
      Math.ceil(Math.sqrt((field.columns * field.rows) / 500)),
    )
    for (let row = 0; row < field.rows; row++) {
      for (let column = 0; column < field.columns; column++) {
        const i = row * field.columns + column
        const current = values(grid, i, (phaseDegrees * Math.PI) / 180)
        if (!current) continue // null is absent copper; zero is present copper.
        const density = current.magnitude / field.copper_thickness
        const x = field.min_x + column * field.cell_width
        const y = field.min_y + row * field.cell_height
        const [left, top] = applyToPoint(ctx.transform, [
          x,
          y + field.cell_height,
        ])
        if (!hasImage)
          heat.push(
            node("rect", {
              x: String(left),
              y: String(top),
              width: String(field.cell_width * Math.abs(ctx.transform.a)),
              height: String(field.cell_height * Math.abs(ctx.transform.d)),
              fill: color((density - minimum) / (upper - minimum)),
              opacity: String(opacity),
              "data-type": "simulation_pcb_return_current_cell",
              "data-pcb-layer": field.layer,
              "data-grid-index": String(i),
              "data-current-density": String(density),
              "data-units": "A/mm²",
            }),
          )
        if (!options.showVectors || row % stride || column % stride) continue
        const length = Math.hypot(current.x, current.y)
        if (length === 0) continue
        const [cx, cy] = applyToPoint(ctx.transform, [
          x + field.cell_width / 2,
          y + field.cell_height / 2,
        ])
        const dx = (current.x / length) * 8
        const dy = (-current.y / length) * 8
        const ex = cx + dx
        const ey = cy + dy
        vectors.push(
          node("path", {
            d: `M ${cx - dx} ${cy - dy} L ${ex} ${ey} M ${ex - dx * 0.4 - dy * 0.3} ${ey - dy * 0.4 + dx * 0.3} L ${ex} ${ey} L ${ex - dx * 0.4 + dy * 0.3} ${ey - dy * 0.4 - dx * 0.3}`,
            fill: "none",
            stroke: "#fff",
            "stroke-width": "1.2",
            "data-type": "simulation_pcb_return_current_vector",
            "data-pcb-layer": field.layer,
            "data-grid-index": String(i),
            "data-sheet-current-x": String(current.x),
            "data-sheet-current-y": String(current.y),
            "data-units": "A/mm",
            "data-phase-degrees": String(phaseDegrees),
          }),
        )
      }
    }
  }

  const highlights: SvgObject[] = []
  for (const excitationId of result.simulation_return_current_excitation_ids) {
    const excitation = circuitJson.find(
      (el) =>
        el.type === "simulation_return_current_excitation" &&
        el.simulation_return_current_excitation_id === excitationId,
    )
    if (
      !excitation ||
      excitation.type !== "simulation_return_current_excitation"
    )
      throw new Error(`Missing return-current excitation '${excitationId}'`)
    if (excitation.simulation_experiment_id !== result.simulation_experiment_id)
      throw new Error(
        `Excitation '${excitationId}' belongs to a different experiment`,
      )
    const trace = circuitJson.find(
      (el) =>
        el.type === "pcb_trace" && el.pcb_trace_id === excitation.pcb_trace_id,
    )
    if (!trace || trace.type !== "pcb_trace")
      throw new Error(`Missing signal trace '${excitation.pcb_trace_id}'`)
    highlights.push(
      node(
        "g",
        {
          "data-type": "simulation_pcb_return_current_signal",
          "data-pcb-trace-id": trace.pcb_trace_id,
        },
        createSvgObjectsFromPcbTrace(
          {
            ...trace,
            route: trace.route.map((point) => {
              const { is_inside_copper_pour, copper_pour_id, ...geometry } =
                point as typeof point & {
                  is_inside_copper_pour?: boolean
                  copper_pour_id?: string
                }
              return geometry
            }),
          },
          {
            ...ctx,
            layer: undefined,
            showSolderMask: false,
            circuitJson: circuitJson.filter(
              (el) => el.type !== "pcb_copper_pour",
            ),
            colorMap: {
              ...ctx.colorMap,
              copper: {
                ...ctx.colorMap.copper,
                top: "#08d9ef",
                bottom: "#ff941f",
              },
            },
          },
        ),
      ),
    )
  }
  for (const element of circuitJson) {
    if (
      element.type !== "simulation_pcb_return_current_marker" ||
      !matches(element)
    )
      continue
    const marker = simulation_pcb_return_current_marker.parse(element)
    const target =
      marker.target_type === "pcb_port"
        ? circuitJson.find(
            (el) =>
              el.type === "pcb_port" && el.pcb_port_id === marker.pcb_port_id,
          )
        : circuitJson.find(
            (el) =>
              el.type === "pcb_via" && el.pcb_via_id === marker.pcb_via_id,
          )
    if (!target || (target.type !== "pcb_port" && target.type !== "pcb_via"))
      throw new Error(
        `Missing ${marker.target_type} for return-current marker '${marker.simulation_pcb_return_current_marker_id}'`,
      )
    const [x, y] = applyToPoint(ctx.transform, [
      distance.parse(target.x),
      distance.parse(target.y),
    ])
    const markerColor = marker.role.startsWith("return_")
      ? "#ed80e6"
      : "#08d9ef"
    const padObjects =
      marker.target_type === "pcb_port"
        ? circuitJson.flatMap((el) =>
            el.type === "pcb_smtpad" && el.pcb_port_id === marker.pcb_port_id
              ? createSvgObjectsFromSmtPad(el, {
                  ...ctx,
                  layer: undefined,
                  showSolderMask: false,
                  colorMap: {
                    ...ctx.colorMap,
                    copper: { ...ctx.colorMap.copper, [el.layer]: markerColor },
                  },
                })
              : [],
          )
        : []
    const viaObjects =
      target.type === "pcb_via"
        ? createSvgObjectsFromPcbVia(target, {
            ...ctx,
            layer: undefined,
            showSolderMask: false,
            colorMap: {
              ...ctx.colorMap,
              drill: "#102b29",
              copper: { ...ctx.colorMap.copper, top: markerColor },
            },
          })
        : []
    const children: SvgObject[] = [
      ...padObjects,
      ...viaObjects,
      node("circle", {
        cx: String(x),
        cy: String(y),
        r: "8",
        stroke: markerColor,
        "stroke-width": "3",
        fill: "none",
      }),
    ]
    if (marker.label) {
      const labelPoint: [number, number] =
        marker.label_x !== undefined && marker.label_y !== undefined
          ? applyToPoint(ctx.transform, [marker.label_x, marker.label_y])
          : [x + 13, y - 13]
      children.push(
        node("line", {
          x1: String(x),
          y1: String(y),
          x2: String(labelPoint[0]),
          y2: String(labelPoint[1]),
          stroke: markerColor,
          "stroke-width": "1",
        }),
      )
      children.push(
        text(marker.label, {
          x: String(labelPoint[0]),
          y: String(labelPoint[1] - 4),
          fill: "white",
          "font-size": "12",
          "font-family": "sans-serif",
          "paint-order": "stroke",
          stroke: "#122b29",
          "stroke-width": "4",
        }),
      )
    }
    highlights.push(
      node(
        "g",
        {
          "data-type": marker.type,
          "data-role": marker.role,
          "data-target-type": marker.target_type,
          "data-target-id":
            marker.target_type === "pcb_port"
              ? marker.pcb_port_id
              : marker.pcb_via_id,
        },
        children,
      ),
    )
  }
  const legend: SvgObject[] = []
  if (options.showLegend !== false) {
    const frequency =
      result.frequency_hz === undefined
        ? "frequency not specified"
        : `${result.frequency_hz / 1e6} MHz`
    const labels = `${frequency} · ${ctx.layer ?? "all result layers"} · density A/mm² · cyan: top signal · orange: bottom signal · magenta: return`
    legend.push(
      node("rect", {
        x: "0",
        y: String(height - 28),
        width: String(width),
        height: "28",
        fill: "#102b29",
        opacity: "0.95",
      }),
    )
    legend.push(
      text(labels, {
        x: "10",
        y: String(height - 10),
        fill: "white",
        "font-family": "sans-serif",
        "font-size": "12",
      }),
    )
    if (decoded.length && heatmaps.length === 0) {
      for (let i = 0; i < 80; i++)
        legend.push(
          node("rect", {
            x: String(width - 170 + i * 2),
            y: "12",
            width: "2",
            height: "10",
            fill: color(i / 79),
          }),
        )
      legend.push(
        text(`${minimum.toPrecision(3)} – ${upper.toPrecision(3)} A/mm²`, {
          x: String(width - 170),
          y: "36",
          fill: "white",
          "font-family": "sans-serif",
          "font-size": "12",
        }),
      )
    }
  }
  return [
    node("g", { "data-simulation-result-id": resultId }, [
      ...heat,
      ...vectors,
      ...highlights,
      ...legend,
    ]),
  ]
}
