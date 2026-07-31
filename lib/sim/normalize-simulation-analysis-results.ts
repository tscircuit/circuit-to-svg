import type {
  SimulationExperiment,
  SimulationParameterSweepCoordinate,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import type {
  SimulationAnalysisResult,
  SimulationMeasurementResult,
  SimulationParameterSweep,
  SimulationRenderableResult,
} from "./types"

export type AcSweepView = "magnitude" | "phase"

interface NormalizedSimulationResults {
  graphs: Array<
    SimulationTransientVoltageGraph | SimulationTransientCurrentGraph
  >
  xAxisTitle: string
  yAxisTitle?: string
  usesLogarithmicXValues: boolean
  usesLogarithmicYValues: boolean
}

interface AnalysisGraphCoordinates {
  horizontalCoordinates: number[]
  measuredLevels: number[]
  isCurrent: boolean
}

const getResultName = ({
  simulationResult,
  fallbackName,
  parameterSweepById,
}: {
  simulationResult: SimulationAnalysisResult
  fallbackName: string
  parameterSweepById: Map<string, SimulationParameterSweep>
}): string => {
  const name = simulationResult.name ?? fallbackName
  const coordinates =
    simulationResult.simulation_parameter_sweep_coordinates ??
    (simulationResult.simulation_parameter_sweep_coordinate
      ? [simulationResult.simulation_parameter_sweep_coordinate]
      : [])
  if (coordinates.length === 0) return name
  return `${name} (${coordinates
    .map((coordinate) => {
      const displayCoordinate = getDisplayCoordinate({
        coordinate,
        parameterSweepById,
      })
      return `${displayCoordinate.value}${displayCoordinate.unit}`
    })
    .join(", ")})`
}

const getDisplayCoordinate = ({
  coordinate,
  parameterSweepById,
}: {
  coordinate: SimulationParameterSweepCoordinate
  parameterSweepById: Map<string, SimulationParameterSweep>
}) => {
  const parameterSweep = parameterSweepById.get(
    coordinate.simulation_parameter_sweep_id,
  )
  return {
    value:
      parameterSweep?.display_parameter_values?.[coordinate.sweep_index] ??
      coordinate.parameter_value,
    unit: parameterSweep?.display_parameter_unit ?? coordinate.parameter_unit,
  }
}

const getMeasurementSeriesLabel = ({
  measurement,
  coordinates,
  parameterSweepById,
}: {
  measurement: SimulationMeasurementResult
  coordinates: SimulationParameterSweepCoordinate[]
  parameterSweepById: Map<string, SimulationParameterSweep>
}) => {
  if (coordinates.length === 0) return measurement.name
  return coordinates
    .map((coordinate) => {
      const displayCoordinate = getDisplayCoordinate({
        coordinate,
        parameterSweepById,
      })
      return `${displayCoordinate.value}${displayCoordinate.unit}`
    })
    .join(", ")
}

const getMeasurementDisplayLevel = ({
  measurementValue,
  usesLogarithmicYValues,
}: {
  measurementValue: number
  usesLogarithmicYValues: boolean
}) => (usesLogarithmicYValues ? Math.log10(measurementValue) : measurementValue)

const normalizeMeasurementResult = ({
  measurement,
  parameterSweepById,
  usesLogarithmicXValues,
  usesLogarithmicYValues,
}: {
  measurement: SimulationMeasurementResult
  parameterSweepById: Map<string, SimulationParameterSweep>
  usesLogarithmicXValues: boolean
  usesLogarithmicYValues: boolean
}) => {
  const coordinateSets = measurement.simulation_parameter_sweep_coordinate_sets
  if (!coordinateSets) {
    return [
      {
        type: "simulation_transient_voltage_graph" as const,
        simulation_transient_voltage_graph_id:
          measurement.simulation_measurement_result_id,
        simulation_experiment_id: measurement.simulation_experiment_id,
        name: measurement.name,
        voltage_levels: measurement.measurement_values.map((measurementValue) =>
          getMeasurementDisplayLevel({
            measurementValue,
            usesLogarithmicYValues,
          }),
        ),
        ...getTransientGraphCoordinates(
          measurement.measurement_values.map((_, index) => index),
        ),
      },
    ]
  }

  const seriesByCoordinatePrefix = new Map<
    string,
    {
      horizontalCoordinates: number[]
      measuredLevels: number[]
      prefixCoordinates: SimulationParameterSweepCoordinate[]
    }
  >()
  for (
    let measurementIndex = 0;
    measurementIndex < measurement.measurement_values.length;
    measurementIndex++
  ) {
    const coordinates = coordinateSets[measurementIndex] ?? []
    const xCoordinate = coordinates.at(-1)
    const parameterValue = xCoordinate
      ? getDisplayCoordinate({
          coordinate: xCoordinate,
          parameterSweepById,
        }).value
      : 0
    const horizontalCoordinate = usesLogarithmicXValues
      ? Math.log10(parameterValue)
      : parameterValue
    const prefixCoordinates = coordinates.slice(0, -1)
    const seriesKey = prefixCoordinates
      .map(
        (coordinate) =>
          `${coordinate.simulation_parameter_sweep_id}:${coordinate.sweep_index}`,
      )
      .join("|")
    const series = seriesByCoordinatePrefix.get(seriesKey) ?? {
      horizontalCoordinates: [],
      measuredLevels: [],
      prefixCoordinates,
    }
    series.horizontalCoordinates.push(horizontalCoordinate)
    series.measuredLevels.push(
      getMeasurementDisplayLevel({
        measurementValue: measurement.measurement_values[measurementIndex]!,
        usesLogarithmicYValues,
      }),
    )
    seriesByCoordinatePrefix.set(seriesKey, series)
  }

  return Array.from(seriesByCoordinatePrefix.values()).map(
    (series, seriesIndex) => ({
      type: "simulation_transient_voltage_graph" as const,
      simulation_transient_voltage_graph_id: `${measurement.simulation_measurement_result_id}_${seriesIndex}`,
      simulation_experiment_id: measurement.simulation_experiment_id,
      name: getMeasurementSeriesLabel({
        measurement,
        coordinates: series.prefixCoordinates,
        parameterSweepById,
      }),
      voltage_levels: series.measuredLevels,
      ...getTransientGraphCoordinates(series.horizontalCoordinates),
    }),
  )
}

const getTransientGraphCoordinates = (horizontalCoordinates: number[]) => {
  const firstCoordinate = horizontalCoordinates[0] ?? 0
  const secondCoordinate = horizontalCoordinates[1]

  return {
    timestamps_ms: horizontalCoordinates,
    start_time_ms: firstCoordinate,
    end_time_ms: horizontalCoordinates.at(-1) ?? 0,
    time_per_step:
      secondCoordinate === undefined
        ? 1
        : Math.abs(secondCoordinate - firstCoordinate),
  }
}

const getTransientSimulationResultId = (
  simulationResult:
    | SimulationTransientVoltageGraph
    | SimulationTransientCurrentGraph,
) =>
  simulationResult.type === "simulation_transient_voltage_graph"
    ? simulationResult.simulation_transient_voltage_graph_id
    : simulationResult.simulation_transient_current_graph_id

export const getSimulationAnalysisResultId = (
  simulationResult: SimulationRenderableResult,
): string => {
  if (simulationResult.type === "simulation_measurement_result") {
    return simulationResult.simulation_measurement_result_id
  }
  switch (simulationResult.type) {
    case "simulation_transient_voltage_graph":
      return simulationResult.simulation_transient_voltage_graph_id
    case "simulation_transient_current_graph":
      return simulationResult.simulation_transient_current_graph_id
    case "simulation_dc_operating_point_voltage":
      return simulationResult.simulation_dc_operating_point_voltage_id
    case "simulation_dc_operating_point_current":
      return simulationResult.simulation_dc_operating_point_current_id
    case "simulation_dc_sweep_voltage_graph":
      return simulationResult.simulation_dc_sweep_voltage_graph_id
    case "simulation_dc_sweep_current_graph":
      return simulationResult.simulation_dc_sweep_current_graph_id
    case "simulation_ac_sweep_voltage_graph":
      return simulationResult.simulation_ac_sweep_voltage_graph_id
    case "simulation_ac_sweep_current_graph":
      return simulationResult.simulation_ac_sweep_current_graph_id
  }
}

const getAnalysisGraphCoordinates = ({
  simulationResult,
  acSweepView,
  usesLogarithmicXValues,
}: {
  simulationResult: Exclude<
    SimulationAnalysisResult,
    SimulationTransientVoltageGraph | SimulationTransientCurrentGraph
  >
  acSweepView: AcSweepView
  usesLogarithmicXValues: boolean
}): AnalysisGraphCoordinates => {
  switch (simulationResult.type) {
    case "simulation_dc_operating_point_voltage":
      return {
        horizontalCoordinates: [0],
        measuredLevels: [simulationResult.voltage],
        isCurrent: false,
      }
    case "simulation_dc_operating_point_current":
      return {
        horizontalCoordinates: [0],
        measuredLevels: [simulationResult.current],
        isCurrent: true,
      }
    case "simulation_dc_sweep_voltage_graph":
      return {
        horizontalCoordinates: simulationResult.sweep_values,
        measuredLevels: simulationResult.voltage_levels,
        isCurrent: false,
      }
    case "simulation_dc_sweep_current_graph":
      return {
        horizontalCoordinates: simulationResult.sweep_values,
        measuredLevels: simulationResult.current_levels,
        isCurrent: true,
      }
    case "simulation_ac_sweep_voltage_graph":
      return {
        horizontalCoordinates: usesLogarithmicXValues
          ? simulationResult.frequencies_hz.map(Math.log10)
          : simulationResult.frequencies_hz,
        measuredLevels: simulationResult.complex_voltages.map((sample) =>
          acSweepView === "phase"
            ? (Math.atan2(sample.im, sample.re) * 180) / Math.PI
            : Math.hypot(sample.re, sample.im),
        ),
        isCurrent: false,
      }
    case "simulation_ac_sweep_current_graph":
      return {
        horizontalCoordinates: usesLogarithmicXValues
          ? simulationResult.frequencies_hz.map(Math.log10)
          : simulationResult.frequencies_hz,
        measuredLevels: simulationResult.complex_currents.map((sample) =>
          acSweepView === "phase"
            ? (Math.atan2(sample.im, sample.re) * 180) / Math.PI
            : Math.hypot(sample.re, sample.im),
        ),
        isCurrent: true,
      }
  }
}

const normalizeSimulationResult = ({
  simulationResult,
  acSweepView,
  usesLogarithmicXValues,
  parameterSweepById,
}: {
  simulationResult: SimulationAnalysisResult
  acSweepView: AcSweepView
  usesLogarithmicXValues: boolean
  parameterSweepById: Map<string, SimulationParameterSweep>
}): SimulationTransientVoltageGraph | SimulationTransientCurrentGraph => {
  if (
    simulationResult.type === "simulation_transient_voltage_graph" ||
    simulationResult.type === "simulation_transient_current_graph"
  ) {
    if (
      !simulationResult.simulation_parameter_sweep_coordinate &&
      !simulationResult.simulation_parameter_sweep_coordinates?.length
    ) {
      return simulationResult
    }
    return {
      ...simulationResult,
      name: getResultName({
        simulationResult,
        fallbackName:
          simulationResult.name ??
          getTransientSimulationResultId(simulationResult),
        parameterSweepById,
      }),
    }
  }

  const simulationResultId = getSimulationAnalysisResultId(simulationResult)
  const { horizontalCoordinates, measuredLevels, isCurrent } =
    getAnalysisGraphCoordinates({
      simulationResult,
      acSweepView,
      usesLogarithmicXValues,
    })
  const transientGraphFields = {
    simulation_experiment_id: simulationResult.simulation_experiment_id,
    simulation_parameter_sweep_coordinate:
      simulationResult.simulation_parameter_sweep_coordinate,
    simulation_parameter_sweep_coordinates:
      simulationResult.simulation_parameter_sweep_coordinates,
    name: getResultName({
      simulationResult,
      fallbackName: simulationResultId,
      parameterSweepById,
    }),
    color: simulationResult.color,
    ...getTransientGraphCoordinates(horizontalCoordinates),
  }

  if (isCurrent) {
    return {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: simulationResultId,
      current_levels: measuredLevels,
      ...transientGraphFields,
    }
  }

  return {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: simulationResultId,
    voltage_levels: measuredLevels,
    ...transientGraphFields,
  }
}

const getXAxisTitle = ({
  simulationResultType,
  experiment,
}: {
  simulationResultType?: SimulationAnalysisResult["type"]
  experiment?: SimulationExperiment
}) => {
  if (simulationResultType?.startsWith("simulation_ac_sweep_")) {
    return "Frequency (Hz)"
  }
  if (simulationResultType?.startsWith("simulation_dc_sweep_")) {
    return experiment?.dc_sweep_unit
      ? `DC Sweep (${experiment.dc_sweep_unit})`
      : "DC Sweep"
  }
  if (simulationResultType?.startsWith("simulation_dc_operating_point_")) {
    return "Operating Point"
  }
  return "Time (ms)"
}

const shouldUseLogarithmicMeasurementXAxis = (
  parameterSweep?: SimulationParameterSweep,
) => {
  const values =
    parameterSweep?.display_parameter_values ??
    parameterSweep?.parameter_values ??
    []
  if (values.length < 3 || values.some((value) => value <= 0)) return false
  return Math.max(...values) / Math.min(...values) >= 100
}

const shouldUseLogarithmicValues = (values: readonly number[]) =>
  values.length >= 3 &&
  values.every((value) => value > 0) &&
  Math.max(...values) / Math.min(...values) >= 100

export const normalizeSimulationAnalysisResults = ({
  results,
  acSweepView,
  experiment,
  parameterSweeps = [],
}: {
  results: SimulationRenderableResult[]
  acSweepView: AcSweepView
  experiment?: SimulationExperiment
  parameterSweeps?: SimulationParameterSweep[]
}): NormalizedSimulationResults => {
  const simulationResultType = results[0]?.type
  const isAcSweep =
    simulationResultType?.startsWith("simulation_ac_sweep_") ?? false

  const parameterSweepById = new Map(
    parameterSweeps.map((parameterSweep) => [
      parameterSweep.simulation_parameter_sweep_id,
      parameterSweep,
    ]),
  )
  const measurementResults = results.filter(
    (result): result is SimulationMeasurementResult =>
      result.type === "simulation_measurement_result",
  )
  const measurementXAxisSweep =
    measurementResults[0]?.simulation_parameter_sweep_coordinate_sets?.[0]?.at(
      -1,
    )
  const measurementXAxisParameter = measurementXAxisSweep
    ? parameterSweepById.get(
        measurementXAxisSweep.simulation_parameter_sweep_id,
      )
    : undefined
  const usesLogarithmicXValues =
    (isAcSweep && experiment?.ac_sweep_type !== "linear") ||
    shouldUseLogarithmicMeasurementXAxis(measurementXAxisParameter)
  const usesLogarithmicYValues = shouldUseLogarithmicValues(
    measurementResults.flatMap((result) => result.measurement_values),
  )
  const graphs: NormalizedSimulationResults["graphs"] = []
  for (const simulationResult of results) {
    if (simulationResult.type === "simulation_measurement_result") {
      graphs.push(
        ...normalizeMeasurementResult({
          measurement: simulationResult,
          parameterSweepById,
          usesLogarithmicXValues,
          usesLogarithmicYValues,
        }),
      )
    } else {
      graphs.push(
        normalizeSimulationResult({
          simulationResult,
          acSweepView,
          usesLogarithmicXValues,
          parameterSweepById,
        }),
      )
    }
  }
  const measurementUnits = new Set(
    measurementResults.map((result) => result.measurement_unit),
  )
  const measurementNames = new Set(
    measurementResults.map((result) => result.name),
  )

  return {
    graphs,
    xAxisTitle:
      simulationResultType === "simulation_measurement_result"
        ? measurementXAxisParameter
          ? `${measurementXAxisParameter.name ?? measurementXAxisParameter.parameter_type} (${measurementXAxisParameter.display_parameter_unit ?? measurementXAxisParameter.parameter_unit})`
          : "Measurement"
        : getXAxisTitle({
            simulationResultType,
            experiment,
          }),
    yAxisTitle:
      simulationResultType === "simulation_measurement_result"
        ? measurementUnits.size === 1
          ? `${
              measurementNames.size === 1
                ? measurementResults[0]?.name
                : "Measurement"
            } (${measurementResults[0]?.measurement_unit})`
          : "Measurement"
        : isAcSweep && acSweepView === "phase"
          ? "Phase (deg)"
          : undefined,
    usesLogarithmicXValues,
    usesLogarithmicYValues,
  }
}
