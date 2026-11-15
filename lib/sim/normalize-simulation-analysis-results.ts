import type {
  SimulationAnalysisResult,
  SimulationExperiment,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
} from "circuit-json"

export type AcSweepView = "magnitude" | "phase"

interface NormalizedSimulationResults {
  graphs: Array<
    SimulationTransientVoltageGraph | SimulationTransientCurrentGraph
  >
  xAxisTitle: string
  yAxisTitle?: string
  usesLogarithmicXValues: boolean
}

interface AnalysisGraphCoordinates {
  horizontalCoordinates: number[]
  measuredLevels: number[]
  isCurrent: boolean
}

const getResultName = ({
  simulationResult,
  fallbackName,
}: {
  simulationResult: SimulationAnalysisResult
  fallbackName: string
}): string => {
  const name = simulationResult.name ?? fallbackName
  const coordinate = simulationResult.simulation_parameter_sweep_coordinate
  if (!coordinate) return name
  return `${name} (${coordinate.parameter_value}${coordinate.parameter_unit})`
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
  simulationResult: SimulationAnalysisResult,
): string => {
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

const getAcSweepCoordinates = ({
  frequenciesHz,
  complexSamples,
  acSweepView,
  usesLogarithmicXValues,
  isCurrent,
}: {
  frequenciesHz: number[]
  complexSamples: Array<{ re: number; im: number }>
  acSweepView: AcSweepView
  usesLogarithmicXValues: boolean
  isCurrent: boolean
}): AnalysisGraphCoordinates => {
  const horizontalCoordinates: number[] = []
  const measuredLevels: number[] = []
  const sampleCount = Math.min(frequenciesHz.length, complexSamples.length)

  for (let i = 0; i < sampleCount; i++) {
    const frequency = frequenciesHz[i]!
    const sample = complexSamples[i]!
    if (!Number.isFinite(frequency)) continue
    if (usesLogarithmicXValues && frequency <= 0) continue

    horizontalCoordinates.push(
      usesLogarithmicXValues ? Math.log10(frequency) : frequency,
    )
    measuredLevels.push(
      acSweepView === "phase"
        ? (Math.atan2(sample.im, sample.re) * 180) / Math.PI
        : Math.hypot(sample.re, sample.im),
    )
  }

  return {
    horizontalCoordinates,
    measuredLevels,
    isCurrent,
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
      return getAcSweepCoordinates({
        frequenciesHz: simulationResult.frequencies_hz,
        complexSamples: simulationResult.complex_voltages,
        acSweepView,
        usesLogarithmicXValues,
        isCurrent: false,
      })
    case "simulation_ac_sweep_current_graph":
      return getAcSweepCoordinates({
        frequenciesHz: simulationResult.frequencies_hz,
        complexSamples: simulationResult.complex_currents,
        acSweepView,
        usesLogarithmicXValues,
        isCurrent: true,
      })
  }
}

const normalizeSimulationResult = ({
  simulationResult,
  acSweepView,
  usesLogarithmicXValues,
}: {
  simulationResult: SimulationAnalysisResult
  acSweepView: AcSweepView
  usesLogarithmicXValues: boolean
}): SimulationTransientVoltageGraph | SimulationTransientCurrentGraph => {
  if (
    simulationResult.type === "simulation_transient_voltage_graph" ||
    simulationResult.type === "simulation_transient_current_graph"
  ) {
    if (!simulationResult.simulation_parameter_sweep_coordinate) {
      return simulationResult
    }
    return {
      ...simulationResult,
      name: getResultName({
        simulationResult,
        fallbackName:
          simulationResult.name ??
          getTransientSimulationResultId(simulationResult),
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
    name: getResultName({
      simulationResult,
      fallbackName: simulationResultId,
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

export const normalizeSimulationAnalysisResults = ({
  results,
  acSweepView,
  experiment,
}: {
  results: SimulationAnalysisResult[]
  acSweepView: AcSweepView
  experiment?: SimulationExperiment
}): NormalizedSimulationResults => {
  const nonOperatingPointResults = results.filter(
    (result) => !result.type.startsWith("simulation_dc_operating_point_"),
  )
  const effectiveResults =
    nonOperatingPointResults.length > 0 ? nonOperatingPointResults : results
  const simulationResultType = effectiveResults[0]?.type
  const isAcSweep =
    simulationResultType?.startsWith("simulation_ac_sweep_") ?? false
  const hasPositiveAcFrequencies = effectiveResults.some(
    (result) =>
      (result.type === "simulation_ac_sweep_voltage_graph" ||
        result.type === "simulation_ac_sweep_current_graph") &&
      result.frequencies_hz.some(
        (frequency) => Number.isFinite(frequency) && frequency > 0,
      ),
  )
  const usesLogarithmicXValues =
    isAcSweep &&
    experiment?.ac_sweep_type !== "linear" &&
    hasPositiveAcFrequencies

  const graphs = effectiveResults.map((simulationResult) =>
    normalizeSimulationResult({
      simulationResult,
      acSweepView,
      usesLogarithmicXValues,
    }),
  )

  return {
    graphs,
    xAxisTitle: getXAxisTitle({
      simulationResultType,
      experiment,
    }),
    yAxisTitle:
      isAcSweep && acSweepView === "phase" ? "Phase (deg)" : undefined,
    usesLogarithmicXValues,
  }
}
