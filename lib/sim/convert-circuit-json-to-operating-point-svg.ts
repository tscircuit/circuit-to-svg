import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationExperimentError,
  SimulationOperatingPointCurrent,
  SimulationOperatingPointVoltage,
} from "circuit-json"
import { stringify } from "svgson"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"
import type { SvgObject } from "../svg-object"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { formatValueWithUnit } from "./simulation-graph-svg/format-value-with-unit"
import {
  formatNumber,
  svgElement,
  textNode,
} from "./simulation-graph-svg/simulation-graph-svg-shared"
import {
  type CircuitJsonWithSimulation,
  isSimulationExperiment,
  isSimulationExperimentError,
  isSimulationOperatingPointCurrent,
  isSimulationOperatingPointVoltage,
} from "./types"

interface ConvertOperatingPointParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_operating_point_voltage_ids?: string[]
  simulation_operating_point_current_ids?: string[]
  width?: number
  height?: number
  includeVersion?: boolean
}

type OperatingPointMeasurement =
  | SimulationOperatingPointVoltage
  | SimulationOperatingPointCurrent

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 480
const OUTER_MARGIN = 48
const TITLE_HEIGHT = 72
const TABLE_HEADER_HEIGHT = 46
const ROW_HEIGHT = 58
const ERROR_CARD_HEIGHT = 128
const SECTION_GAP = 28

export function convertCircuitJsonToOperatingPointSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_operating_point_voltage_ids,
  simulation_operating_point_current_ids,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion,
}: ConvertOperatingPointParams): string {
  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      isSimulationExperiment(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  if (!experiment) {
    throw new Error(
      `No simulation_experiment found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }
  if (experiment.experiment_type !== "spice_dc_operating_point") {
    throw new Error(
      `simulation_experiment "${simulation_experiment_id}" has experiment_type "${experiment.experiment_type}"; expected "spice_dc_operating_point"`,
    )
  }

  const selectedVoltageIds = simulation_operating_point_voltage_ids
    ? new Set(simulation_operating_point_voltage_ids)
    : null
  const selectedCurrentIds = simulation_operating_point_current_ids
    ? new Set(simulation_operating_point_current_ids)
    : null
  const hasMeasurementSelection = Boolean(
    selectedVoltageIds || selectedCurrentIds,
  )

  const voltages = circuitJson.filter(
    (element): element is SimulationOperatingPointVoltage =>
      isSimulationOperatingPointVoltage(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!hasMeasurementSelection ||
        (selectedVoltageIds?.has(
          element.simulation_operating_point_voltage_id,
        ) ??
          false)),
  )
  const currents = circuitJson.filter(
    (element): element is SimulationOperatingPointCurrent =>
      isSimulationOperatingPointCurrent(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!hasMeasurementSelection ||
        (selectedCurrentIds?.has(
          element.simulation_operating_point_current_id,
        ) ??
          false)),
  )
  const measurements: OperatingPointMeasurement[] = [...voltages, ...currents]
  const errors = circuitJson.filter(
    (element): element is SimulationExperimentError =>
      isSimulationExperimentError(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  if (measurements.length === 0 && errors.length === 0) {
    throw new Error(
      `No operating-point measurements or simulation errors found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }

  const tableHeight =
    measurements.length > 0
      ? TABLE_HEADER_HEIGHT + measurements.length * ROW_HEIGHT
      : 0
  const errorHeight =
    errors.length > 0
      ? errors.length * ERROR_CARD_HEIGHT + Math.max(0, errors.length - 1) * 12
      : 0
  const contentHeight =
    OUTER_MARGIN * 2 +
    TITLE_HEIGHT +
    tableHeight +
    errorHeight +
    (tableHeight > 0 && errorHeight > 0 ? SECTION_GAP : 0)
  const outputHeight = Math.max(height, contentHeight)
  const contentWidth = Math.max(1, width - OUTER_MARGIN * 2)

  const children: SvgObject[] = [
    createStyleNode(),
    svgElement("rect", {
      width: formatNumber(width),
      height: formatNumber(outputHeight),
      fill: "#f8fafc",
    }),
    createTitle(experiment, width),
  ]

  let cursorY = OUTER_MARGIN + TITLE_HEIGHT
  if (measurements.length > 0) {
    children.push(
      createMeasurementTable(measurements, OUTER_MARGIN, cursorY, contentWidth),
    )
    cursorY += tableHeight
  }
  if (errors.length > 0) {
    if (measurements.length > 0) cursorY += SECTION_GAP
    children.push(createErrorCards(errors, OUTER_MARGIN, cursorY, contentWidth))
  }

  const softwareUsedString = getSoftwareUsedString(
    circuitJson as AnyCircuitElement[],
  )
  return stringify(
    svgElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: formatNumber(width),
        height: formatNumber(outputHeight),
        viewBox: `0 0 ${formatNumber(width)} ${formatNumber(outputHeight)}`,
        "data-simulation-experiment-id": simulation_experiment_id,
        "data-simulation-experiment-name": experiment.name,
        "data-simulation-view": "operating-point",
        ...(softwareUsedString && {
          "data-software-used-string": softwareUsedString,
        }),
        ...(includeVersion && {
          "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION,
        }),
      },
      children,
    ),
  )
}

function createStyleNode(): SvgObject {
  return svgElement("style", {}, [
    textNode(`
      .op-title { font: 700 24px Arial, sans-serif; fill: #0f172a; }
      .op-subtitle { font: 14px Arial, sans-serif; fill: #64748b; }
      .op-heading { font: 700 13px Arial, sans-serif; fill: #475569; letter-spacing: .04em; }
      .op-label { font: 600 15px Arial, sans-serif; fill: #0f172a; }
      .op-meta { font: 13px Arial, sans-serif; fill: #64748b; }
      .op-value { font: 700 16px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #0f172a; }
      .op-error-title { font: 700 15px Arial, sans-serif; fill: #991b1b; }
      .op-error-text { font: 13px Arial, sans-serif; fill: #7f1d1d; }
      .op-error-guidance { font: 13px Arial, sans-serif; fill: #475569; }
    `),
  ])
}

function createTitle(
  experiment: SimulationExperiment,
  width: number,
): SvgObject {
  return svgElement("g", {}, [
    svgElement(
      "text",
      {
        class: "op-title",
        x: formatNumber(OUTER_MARGIN),
        y: formatNumber(OUTER_MARGIN + 25),
      },
      [textNode(experiment.name || "DC Operating Point")],
    ),
    svgElement(
      "text",
      {
        class: "op-subtitle",
        x: formatNumber(width - OUTER_MARGIN),
        y: formatNumber(OUTER_MARGIN + 24),
        "text-anchor": "end",
      },
      [textNode("DC operating-point results")],
    ),
  ])
}

function createMeasurementTable(
  measurements: OperatingPointMeasurement[],
  x: number,
  y: number,
  width: number,
): SvgObject {
  const typeX = x + width * 0.42
  const sourceX = x + width * 0.59
  const valueX = x + width - 24
  const children: SvgObject[] = [
    svgElement("rect", {
      x: formatNumber(x),
      y: formatNumber(y),
      width: formatNumber(width),
      height: formatNumber(TABLE_HEADER_HEIGHT),
      rx: "10",
      fill: "#e2e8f0",
    }),
    createText("MEASUREMENT", x + 24, y + 29, "op-heading"),
    createText("TYPE", typeX, y + 29, "op-heading"),
    createText("SOURCE", sourceX, y + 29, "op-heading"),
    createText("VALUE", valueX, y + 29, "op-heading", "end"),
  ]

  measurements.forEach((measurement, index) => {
    const rowY = y + TABLE_HEADER_HEIGHT + index * ROW_HEIGHT
    const isVoltage = measurement.type === "simulation_operating_point_voltage"
    const color = measurement.color ?? (isVoltage ? "#2563eb" : "#ea580c")
    const label = getMeasurementLabel(measurement, index)
    const source = getMeasurementSource(measurement)
    const value = isVoltage
      ? formatValueWithUnit(measurement.voltage, "V")
      : formatValueWithUnit(measurement.current, "A")
    const id = isVoltage
      ? measurement.simulation_operating_point_voltage_id
      : measurement.simulation_operating_point_current_id

    children.push(
      svgElement(
        "g",
        {
          class: "op-measurement-row",
          [isVoltage
            ? "data-simulation-operating-point-voltage-id"
            : "data-simulation-operating-point-current-id"]: id,
        },
        [
          svgElement("rect", {
            x: formatNumber(x),
            y: formatNumber(rowY),
            width: formatNumber(width),
            height: formatNumber(ROW_HEIGHT),
            fill: index % 2 === 0 ? "#ffffff" : "#f8fafc",
            stroke: "#e2e8f0",
            "stroke-width": "1",
          }),
          svgElement("circle", {
            cx: formatNumber(x + 16),
            cy: formatNumber(rowY + ROW_HEIGHT / 2),
            r: "5",
            fill: color,
          }),
          createText(label, x + 30, rowY + 35, "op-label"),
          createText(
            isVoltage ? "Voltage" : "Current",
            typeX,
            rowY + 35,
            "op-meta",
          ),
          createText(source, sourceX, rowY + 35, "op-meta"),
          createText(value, valueX, rowY + 36, "op-value", "end"),
        ],
      ),
    )
  })

  return svgElement("g", { class: "op-measurement-table" }, children)
}

function createErrorCards(
  errors: SimulationExperimentError[],
  x: number,
  y: number,
  width: number,
): SvgObject {
  const children = errors.map((error, index) => {
    const cardY = y + index * (ERROR_CARD_HEIGHT + 12)
    const message = truncateText(error.message, 145)
    const guidance = getErrorGuidance(error.error_code)
    return svgElement(
      "g",
      {
        class: "op-error-card",
        "data-simulation-experiment-error-id":
          error.simulation_experiment_error_id,
        "data-error-code": error.error_code,
      },
      [
        svgElement("rect", {
          x: formatNumber(x),
          y: formatNumber(cardY),
          width: formatNumber(width),
          height: formatNumber(ERROR_CARD_HEIGHT),
          rx: "10",
          fill: "#fef2f2",
          stroke: "#fecaca",
          "stroke-width": "1",
        }),
        createText(
          getErrorTitle(error.error_code),
          x + 20,
          cardY + 29,
          "op-error-title",
        ),
        createText(message, x + 20, cardY + 57, "op-error-text"),
        createText(guidance, x + 20, cardY + 88, "op-error-guidance"),
        createText(`Code: ${error.error_code}`, x + 20, cardY + 111, "op-meta"),
      ],
    )
  })
  return svgElement("g", { class: "op-errors" }, children)
}

function createText(
  value: string,
  x: number,
  y: number,
  className: string,
  textAnchor?: "start" | "middle" | "end",
): SvgObject {
  return svgElement(
    "text",
    {
      class: className,
      x: formatNumber(x),
      y: formatNumber(y),
      ...(textAnchor && { "text-anchor": textAnchor }),
    },
    [textNode(value)],
  )
}

function getMeasurementLabel(
  measurement: OperatingPointMeasurement,
  index: number,
): string {
  return truncateText(
    measurement.name ??
      (measurement.type === "simulation_operating_point_voltage"
        ? measurement.source_node_name
        : measurement.source_component_id) ??
      `${measurement.type === "simulation_operating_point_voltage" ? "Voltage" : "Current"} ${index + 1}`,
    38,
  )
}

function getMeasurementSource(measurement: OperatingPointMeasurement): string {
  if (measurement.type === "simulation_operating_point_voltage") {
    const source = measurement.source_node_name ?? "node"
    const reference = measurement.reference_node_name ?? "0"
    return truncateText(`${source} to ${reference}`, 32)
  }
  return truncateText(
    measurement.source_component_id ?? measurement.source_trace_id ?? "branch",
    32,
  )
}

function getErrorTitle(
  errorCode: SimulationExperimentError["error_code"],
): string {
  const titles: Record<SimulationExperimentError["error_code"], string> = {
    non_convergent: "Operating point did not converge",
    timeout: "Simulation timed out",
    missing_model: "A SPICE model is missing",
    unsupported_analysis: "Analysis is not supported",
    invalid_netlist: "Generated SPICE is invalid",
    engine_error: "Simulation engine failed",
  }
  return titles[errorCode]
}

function getErrorGuidance(
  errorCode: SimulationExperimentError["error_code"],
): string {
  const guidance: Record<SimulationExperimentError["error_code"], string> = {
    non_convergent:
      "Feedback or an oscillator may have no stable DC state; try a transient analysis or initial conditions.",
    timeout:
      "Increase the timeout, simplify the circuit, or use transient analysis for circuits without a stable DC state.",
    missing_model:
      "Add a SPICE model, or mark the proprietary IC as a simulation boundary.",
    unsupported_analysis:
      "Select an analysis supported by the configured SPICE engine.",
    invalid_netlist:
      "Check component values, connectivity, and generated model definitions.",
    engine_error:
      "Review the engine diagnostic and generated netlist, then retry the simulation.",
  }
  return guidance[errorCode]
}

function truncateText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value
  return `${value.slice(0, Math.max(0, maximumLength - 1))}…`
}
