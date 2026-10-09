import {
  simulation_pcb_noise_configuration,
  simulation_pcb_noise_result,
  simulation_pcb_noise_waveform_json,
  simulation_pcb_noise_spectrum_json,
  simulation_pcb_noise_eye_json,
  validatePcbNoiseCircuitJson,
  type AnyCircuitElement,
  type SimulationPcbNoiseAsset,
  type SimulationPcbNoiseWaveformJson,
  type SimulationPcbNoiseConfiguration,
} from "circuit-json"
import {
  loadNoiseAsset,
  DEFAULT_ASSET_LIMITS,
  validateNoiseManifest,
  canonicalJson,
  sha256,
  collectNoiseGeometryInputs,
  createNoiseAssetBudget,
  type LoadAssetOptions,
} from "simulate-pcb-noise"
import {
  convertCircuitJsonToPcbSvg,
  type PcbSvgOptions,
} from "../../pcb/convert-circuit-json-to-pcb-svg"
import { convertCircuitJsonToSimulationGraphSvg } from "../convert-circuit-json-to-simulation-graph-svg"
import { previewEnvelope } from "./preview-envelope"
import { renderNoiseEye } from "./render-eye"

export type PcbNoiseSvgOptions = Omit<
  PcbSvgOptions,
  "simulationResultId" | "noiseContacts"
> &
  Omit<
    LoadAssetOptions,
    | "expectedObservationName"
    | "expectedInputHash"
    | "expectedSourceHash"
    | "expectedWaveformHash"
  > & {
    simulationResultId: string
    observationName: string
    view: "waveform" | "spectrum" | "eye" | "pcb"
    waveformVariants?: ("total" | "baseline" | "difference")[]
    /** Require this spectrum normalization; the renderer never recomputes an analysis. */
    spectrumKind?: "psd" | "amplitude_peak" | "amplitude_rms"
  }

function unique<T>(values: T[], label: string): T {
  if (values.length !== 1)
    throw new Error(`Expected exactly one ${label}; found ${values.length}`)
  return values[0]!
}

function previewGraph(
  experimentId: string,
  id: string,
  name: string,
  x: number[],
  values: number[],
  unit: "V" | "A",
  width: number,
  segmentStarts?: number[],
) {
  const preview = segmentStarts
    ? { x, values }
    : previewEnvelope(x, values, width - 200)
  const common = {
    simulation_experiment_id: experimentId,
    timestamps_ms: preview.x,
    start_time_ms: preview.x[0]!,
    end_time_ms: preview.x[preview.x.length - 1]!,
    time_per_step: preview.x[1]! - preview.x[0]!,
    name,
    ...(segmentStarts ? { segment_start_indices: segmentStarts } : {}),
  }
  return unit === "V"
    ? {
        ...common,
        type: "simulation_transient_voltage_graph" as const,
        simulation_transient_voltage_graph_id: id,
        voltage_levels: preview.values,
      }
    : {
        ...common,
        type: "simulation_transient_current_graph" as const,
        simulation_transient_current_graph_id: id,
        current_levels: preview.values,
      }
}

function waveformGraphs(
  waveform: SimulationPcbNoiseWaveformJson,
  experimentId: string,
  width: number,
) {
  const times =
    waveform.time.kind === "explicit"
      ? waveform.time.times_s
      : waveform.values.map((_, index) =>
          waveform.time.kind === "uniform"
            ? waveform.time.start_s + index * waveform.time.step_s
            : 0,
        )
  const x: number[] = [],
    values: number[] = [],
    segmentStarts: number[] = []
  let index = 0
  for (const interval of waveform.valid_intervals_s) {
    const start = index
    while (index < times.length && times[index]! <= interval.end_s) index++
    const preview = previewEnvelope(
      times
        .slice(start, index)
        .map((time) => time * 1000), // SI seconds → legacy milliseconds exactly once.
      waveform.values.slice(start, index),
      width - 200,
    )
    segmentStarts.push(x.length)
    x.push(...preview.x)
    values.push(...preview.values)
  }
  return [
    previewGraph(
      experimentId,
      `${waveform.observation_name}-${waveform.variant}`,
      waveform.variant,
      x,
      values,
      waveform.unit,
      width,
      segmentStarts,
    ),
  ]
}

/** Browser-safe selected plots. Every asset read is explicit and hash/limit validated. */
export async function convertCircuitJsonToPcbNoiseSvg(
  circuitJson: AnyCircuitElement[],
  options: PcbNoiseSvgOptions,
): Promise<string> {
  if (!["waveform", "spectrum", "eye", "pcb"].includes(options.view))
    throw new Error("Unknown PCB noise view")
  const width = options.width ?? 1200
  const height = options.height ?? 600
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 400 ||
    height < 240 ||
    width > 4096 ||
    height > 4096
  )
    throw new Error(
      "PCB noise plot dimensions must be between 400×240 and 4096×4096",
    )
  const result = simulation_pcb_noise_result.parse(
    unique(
      circuitJson.filter(
        (element) =>
          element.type === "simulation_pcb_noise_result" &&
          element.simulation_pcb_noise_result_id === options.simulationResultId,
      ),
      "selected PCB noise result",
    ),
  )
  if (result.status !== "completed")
    throw new Error(
      `PCB noise result is ${result.status}: ${result.diagnostics.map((entry) => entry.message).join("; ")}`,
    )
  const configurationInput = unique(
    circuitJson.filter(
      (element): element is SimulationPcbNoiseConfiguration =>
        element.type === "simulation_pcb_noise_configuration" &&
        element.simulation_pcb_noise_configuration_id ===
          result.simulation_pcb_noise_configuration_id,
    ),
    "selected PCB noise configuration",
  )
  const configuration =
    simulation_pcb_noise_configuration.parse(configurationInput)
  // Validate the selected experiment with its physical geometry; unrelated noise runs are preserved.
  validatePcbNoiseCircuitJson(
    circuitJson.filter((element) => {
      if (element.type === "simulation_pcb_noise_result")
        return (
          element.simulation_pcb_noise_result_id === options.simulationResultId
        )
      if (element.type === "simulation_pcb_noise_configuration")
        return (
          element.simulation_pcb_noise_configuration_id ===
          configuration.simulation_pcb_noise_configuration_id
        )
      if (
        element.type === "simulation_experiment" &&
        element.experiment_type === "pcb_noise"
      )
        return (
          element.simulation_experiment_id === result.simulation_experiment_id
        )
      return true
    }),
  )
  const observation = unique(
    configuration.observations.filter(
      (entry) => entry.name === options.observationName,
    ),
    "selected noise observation",
  )
  if (!result.observation_names.includes(observation.name))
    throw new Error("Selected result does not contain this observation")
  const expected = {
    ...options,
    budget: options.budget ?? createNoiseAssetBudget(options.limits),
    expectedRunId: result.run_id,
    expectedExperimentId: result.simulation_experiment_id,
    expectedConfigurationId: result.simulation_pcb_noise_configuration_id,
    expectedBoardId: result.pcb_board_id,
  }
  const variants = options.waveformVariants ?? [
    "total",
    "baseline",
    "difference",
  ]
  if (!variants.length || new Set(variants).size !== variants.length)
    throw new Error("Select unique waveform variants")
  const selectedWaveforms = result.waveform_assets.filter(
    (entry) =>
      entry.observation_name === observation.name &&
      variants.includes(entry.variant),
  )
  const selectedDescriptors =
    options.view === "waveform"
      ? selectedWaveforms.map((entry) => entry.asset)
      : options.view === "eye"
        ? [
            unique(
              (result.eye_assets ?? []).filter(
                (entry) => entry.observation_name === observation.name,
              ),
              "selected eye",
            ).asset,
          ]
        : options.view === "spectrum"
          ? [
              unique(
                (result.spectrum_assets ?? []).filter(
                  (entry) => entry.observation_name === observation.name,
                ),
                "selected spectrum",
              ).asset,
            ]
          : []
  const limits = { ...DEFAULT_ASSET_LIMITS, ...options.limits }
  const descriptors = [result.manifest_asset, ...selectedDescriptors]
  if (
    selectedDescriptors.length > limits.channels ||
    descriptors.reduce((total, entry) => total + entry.decoded_byte_length, 0) >
      limits.decodedBytes ||
    descriptors
      .filter((entry) => entry.asset.mimetype === "application/gzip")
      .reduce((total, entry) => total + entry.byte_length, 0) >
      limits.compressedBytes
  )
    throw new Error("Selected noise assets exceed aggregate resource limits")
  const manifest = validateNoiseManifest(
    await loadNoiseAsset(result.manifest_asset, expected),
    expected,
  )
  const currentInputs = {
    geometry: {
      records: collectNoiseGeometryInputs(circuitJson, result.pcb_board_id),
    },
    configuration,
    sources: { sources: configuration.sources },
    loads: { terminations: configuration.terminations },
  }
  for (const key of [
    "geometry",
    "configuration",
    "sources",
    "loads",
  ] as const) {
    if (
      (await sha256(JSON.stringify(currentInputs[key]))) !==
        manifest.inputs[key].sha256 ||
      (await sha256(canonicalJson(currentInputs[key]))) !==
        manifest.inputs[key].canonical_sha256
    )
      throw new Error(
        `Stale noise result: current ${key} differs from its run manifest`,
      )
  }
  const assertAttested = (descriptor: SimulationPcbNoiseAsset) => {
    if (
      !manifest.artifacts.some(
        (artifact) =>
          artifact.data_format === descriptor.data_format &&
          artifact.sha256 === descriptor.sha256 &&
          artifact.encoded_sha256 === descriptor.encoded_sha256 &&
          artifact.canonical_sha256 === descriptor.canonical_sha256 &&
          artifact.byte_length === descriptor.byte_length &&
          artifact.decoded_byte_length === descriptor.decoded_byte_length,
      )
    )
      throw new Error("Selected noise asset is missing from its run manifest")
  }
  selectedDescriptors.forEach(assertAttested)
  const load = async (descriptor: SimulationPcbNoiseAsset) =>
    loadNoiseAsset(descriptor, {
      ...expected,
      expectedObservationName: observation.name,
    })
  const title = `${observation.name} · ${result.model_tier} · ${result.validation.state}`
  if (options.view === "pcb") {
    const port = unique(
      configuration.ports.filter(
        (entry) => entry.name === observation.port_name,
      ),
      "observation physical port",
    )
    return convertCircuitJsonToPcbSvg(circuitJson, {
      ...options,
      simulationResultId: undefined,
      width,
      height,
      viewportTarget: { pcb_board_id: result.pcb_board_id },
      noiseContacts: [
        { portName: port.name, role: "signal", contact: port.signal_contact },
        {
          portName: port.name,
          role: "reference",
          contact: port.reference_contact,
        },
      ],
    })
  }
  const totalDescriptor = unique(
    result.waveform_assets.filter(
      (entry) =>
        entry.observation_name === observation.name &&
        entry.variant === "total",
    ),
    "total waveform",
  ).asset
  if (options.view === "eye" || options.view === "spectrum")
    assertAttested(totalDescriptor)
  if (options.view === "eye") {
    const descriptor = unique(
      (result.eye_assets ?? []).filter(
        (entry) => entry.observation_name === observation.name,
      ),
      "selected eye",
    ).asset
    const eye = simulation_pcb_noise_eye_json.parse(await load(descriptor))
    if (eye.waveform_sha256 !== totalDescriptor.sha256)
      throw new Error(
        "Eye waveform hash does not match selected total waveform",
      )
    const authoredEye = unique(
      (configuration.eyes ?? []).filter(
        (entry) => entry.observation_name === observation.name,
      ),
      "authored eye timing",
    )
    if (
      eye.timing_sha256 !== (await sha256(canonicalJson(authoredEye.timing))) ||
      eye.resolved_timing.kind !== authoredEye.timing.kind
    )
      throw new Error(
        "Stale eye timing does not match the authored timing reference",
      )
    if (
      eye.resolved_timing.sample_offset_s !==
        authoredEye.timing.sample_offset_s ||
      (authoredEye.timing.kind === "known_ui" &&
        (eye.unit_interval_s !== authoredEye.timing.unit_interval_s ||
          (authoredEye.timing.origin.kind === "authored_epoch" &&
            eye.resolved_timing.epoch_s !== authoredEye.timing.origin.epoch_s)))
    )
      throw new Error(
        "Resolved eye timing differs from authored UI, epoch or sample offset",
      )
    if (
      eye.resolved_timing.kind === "explicit_clock" &&
      authoredEye.timing.kind === "explicit_clock" &&
      (eye.resolved_timing.interpretation !==
        authoredEye.timing.interpretation ||
        eye.resolved_timing.edge_polarity !== authoredEye.timing.edge ||
        canonicalJson(eye.resolved_timing.clock_source) !==
          canonicalJson(authoredEye.timing.clock))
    )
      throw new Error(
        "Resolved eye clock source or interpretation differs from authored timing",
      )
    if (
      eye.resolved_timing.kind === "explicit_clock" &&
      authoredEye.timing.kind === "explicit_clock" &&
      authoredEye.timing.clock.kind === "observation"
    ) {
      const clockName = authoredEye.timing.clock.observation_name
      const clockDescriptor = unique(
        result.waveform_assets.filter(
          (entry) =>
            entry.observation_name === clockName && entry.variant === "total",
        ),
        "independent clock waveform",
      ).asset
      assertAttested(clockDescriptor)
      if (eye.resolved_timing.clock_waveform_sha256 !== clockDescriptor.sha256)
        throw new Error(
          "Eye clock waveform hash differs from its selected independent clock",
        )
    }
    const timingLabel =
      authoredEye.timing.kind === "explicit_clock"
        ? `explicit clock · ${authoredEye.timing.interpretation.replaceAll("_", " ")}`
        : `known UI · ${authoredEye.timing.origin.kind.replaceAll("_", " ")}`
    return renderNoiseEye(eye, title, timingLabel, width, height)
  }
  const experiment = {
    type: "simulation_experiment" as const,
    simulation_experiment_id: result.simulation_experiment_id,
    experiment_type: "spice_transient_analysis" as const,
    name: title,
  }
  if (options.view === "spectrum") {
    const descriptor = unique(
      (result.spectrum_assets ?? []).filter(
        (entry) => entry.observation_name === observation.name,
      ),
      "selected spectrum",
    ).asset
    const spectrum = simulation_pcb_noise_spectrum_json.parse(
      await load(descriptor),
    )
    if (spectrum.waveform_sha256 !== totalDescriptor.sha256)
      throw new Error(
        "Spectrum waveform hash does not match selected total waveform",
      )
    if (options.spectrumKind && spectrum.kind !== options.spectrumKind)
      throw new Error("Selected spectrum has a different normalization")
    const expectedUnit = observation.quantity === "voltage" ? "V" : "A"
    if (
      spectrum.unit !==
      (spectrum.kind === "psd" ? `${expectedUnit}^2/Hz` : expectedUnit)
    )
      throw new Error("Spectrum units do not match selected observation")
    const graph = previewGraph(
      result.simulation_experiment_id,
      "noise-spectrum",
      spectrum.kind === "psd"
        ? "PSD"
        : spectrum.kind === "amplitude_peak"
          ? "Peak"
          : "RMS",
      spectrum.frequencies_hz.map((frequency) => frequency / 1e6),
      spectrum.values,
      expectedUnit,
      width,
    )
    return convertCircuitJsonToSimulationGraphSvg({
      circuitJson: [experiment, graph],
      simulation_experiment_id: result.simulation_experiment_id,
      width,
      height,
      show_points: false,
      x_axis_title: "Frequency (MHz)",
      y_axis_title: `${spectrum.kind.replaceAll("_", " ")} (${spectrum.unit})`,
      y_axis_min: 0,
      subtitle: `${spectrum.sidedness.replaceAll("_", " ")} · ${spectrum.window} · DC ${spectrum.dc_treatment.replaceAll("_", " ")} · ENBW ${(spectrum.enbw_hz / 1e6).toPrecision(4)} MHz · model band ${result.validity_band_hz.min_hz / 1e9}–${result.validity_band_hz.max_hz / 1e9} GHz`,
    })
  }
  if (
    !selectedWaveforms.length ||
    (options.waveformVariants && selectedWaveforms.length !== variants.length)
  )
    throw new Error("Selected waveform variants are unavailable")
  const waveforms = await Promise.all(
    selectedWaveforms.map(async (entry) => {
      const waveform = simulation_pcb_noise_waveform_json.parse(
        await load(entry.asset),
      )
      if (
        waveform.variant !== entry.variant ||
        waveform.unit !== (observation.quantity === "voltage" ? "V" : "A")
      )
        throw new Error("Waveform variant or units do not match selection")
      if (waveform.input_sha256 !== manifest.inputs.geometry.sha256)
        throw new Error(
          "Waveform physical input hash differs from its run manifest",
        )
      const baselineSources = configuration.sources.map((source) =>
        configuration.baseline?.source_names.includes(source.name)
          ? {
              ...source,
              waveform: {
                kind: "dc",
                voltage_v: configuration.baseline.voltage_v,
              },
            }
          : source,
      )
      const sourceHash =
        entry.variant === "baseline"
          ? await sha256(JSON.stringify({ sources: baselineSources }))
          : manifest.inputs.sources.sha256
      if (waveform.source_sha256 !== sourceHash)
        throw new Error(
          "Waveform source hash differs from the selected source policy",
        )
      return waveform
    }),
  )
  if (
    waveforms.length > 1 &&
    waveforms.some((waveform) => waveform.variant !== "total") &&
    waveforms.some(
      (waveform) =>
        !waveform.comparison_identity ||
        waveform.comparison_identity !== waveforms[0]!.comparison_identity,
    )
  )
    throw new Error(
      "Paired waveforms must share their victim, load and timing comparison identity",
    )
  return convertCircuitJsonToSimulationGraphSvg({
    circuitJson: [
      experiment,
      ...waveforms.flatMap((waveform) =>
        waveformGraphs(waveform, result.simulation_experiment_id, width),
      ),
    ],
    simulation_experiment_id: result.simulation_experiment_id,
    width,
    height,
    show_points: false,
    x_axis_title: "Time (ns)",
    x_axis_display_scale: 1e6,
    subtitle: `Thevenin ${configuration.sources.map((source) => `${source.name}: ${source.source_model.resistance_ohms} Ω`).join(", ")} · loads ${configuration.terminations.map((load) => `${load.name}: ${load.model.resistance_ohms} Ω`).join(", ")} · bandwidth ${(waveforms[0]!.bandwidth_hz / 1e9).toPrecision(3)} GHz · extrema envelope`,
  })
}
