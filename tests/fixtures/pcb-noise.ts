import type {
  AnyCircuitElement,
  SimulationPcbNoiseConfiguration,
} from "circuit-json"
import { simulation_pcb_noise_configuration } from "circuit-json"
import {
  buildRunManifest,
  canonicalJson,
  createJsonAsset,
  manifestArtifact,
  sha256,
  computeSpectrum,
  compileSource,
  analyzeEye,
  type Waveform,
} from "simulate-pcb-noise"
import { collectNoiseGeometryInputs } from "simulate-pcb-noise"

const ui = 1e-9
const contacts = [
  { id: "aggressor", x: -3, y: 1 },
  { id: "victim", x: 3, y: -1 },
  { id: "ground", x: 0, y: -2 },
]
const contact = (id: string) => {
  const point = contacts.find((entry) => entry.id === id)!
  return {
    contact_type: "pcb_port" as const,
    pcb_port_id: id,
    x: point.x,
    y: point.y,
    layer: "top" as const,
  }
}
export const noiseConfiguration: SimulationPcbNoiseConfiguration = {
  type: "simulation_pcb_noise_configuration",
  simulation_pcb_noise_configuration_id: "config",
  simulation_experiment_id: "noise",
  pcb_board_id: "board",
  duration_s: ui * 72,
  sample_interval_s: ui / 128,
  ports: [
    {
      name: "aggressor",
      signal_contact: contact("aggressor"),
      reference_contact: contact("ground"),
    },
    {
      name: "victim",
      signal_contact: contact("victim"),
      reference_contact: contact("ground"),
    },
  ],
  sources: ["aggressor", "victim"].map((name, index) => ({
    name,
    port_name: name,
    role: index === 0 ? "aggressor" : "victim",
    source_model: { kind: "thevenin", resistance_ohms: 50 },
    waveform: {
      kind: "prbs",
      order: 7,
      baud_rate_hz: 1 / ui,
      low_voltage_v: 0,
      high_voltage_v: 1,
      rise_time_s: ui / 8,
      fall_time_s: ui / 8,
      edge_time_convention: "10_90",
      seed: index + 1,
      algorithm: "lfsr_fibonacci",
      algorithm_version: "1",
    },
  })),
  terminations: [
    {
      name: "load",
      port_name: "victim",
      model: { kind: "resistor", resistance_ohms: 50, bias_voltage_v: 0 },
    },
  ],
  observations: [
    { name: "victim_voltage", port_name: "victim", quantity: "voltage" },
  ],
  baseline: {
    kind: "quiet_sources",
    source_names: ["aggressor"],
    voltage_v: 0,
  },
  eyes: [
    {
      observation_name: "victim_voltage",
      modulation: "nrz",
      timing: {
        kind: "known_ui",
        unit_interval_s: ui,
        sample_offset_s: ui / 2,
        origin: { kind: "authored_epoch", epoch_s: 0 },
      },
    },
  ],
}

/** Small analytic plot fixture; it does not assert extracted PCB physics. */
export async function pcbNoiseFixture(
  options: { gzip?: boolean; external?: boolean; explicitClock?: boolean } = {},
) {
  let configuration = structuredClone(noiseConfiguration)
  if (options.explicitClock)
    configuration.eyes![0]!.timing = {
      kind: "explicit_clock",
      clock: { kind: "authored_edges", source_name: "victim" },
      edge: "rising",
      threshold_v: 0.5,
      ui_per_selected_edge: 1,
      sample_offset_s: ui / 2,
      interpretation: "nominal_reference",
    }
  configuration = simulation_pcb_noise_configuration.parse(configuration)
  const geometry: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 6,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    ...contacts.flatMap((point) => [
      {
        type: "pcb_port" as const,
        pcb_port_id: point.id,
        source_port_id: `source-${point.id}`,
        x: point.x,
        y: point.y,
        layers: ["top" as const],
      },
      {
        type: "pcb_smtpad" as const,
        pcb_smtpad_id: `pad-${point.id}`,
        pcb_component_id: "component",
        pcb_port_id: point.id,
        shape: "circle" as const,
        x: point.x,
        y: point.y,
        radius: 0.3,
        layer: "top" as const,
      },
    ]),
    ...[1, -1].map((y, index) => ({
      type: "pcb_trace" as const,
      pcb_trace_id: `trace-${index}`,
      route: [
        {
          route_type: "wire" as const,
          x: -3,
          y,
          width: 0.2,
          layer: "top" as const,
        },
        {
          route_type: "wire" as const,
          x: 3,
          y,
          width: 0.2,
          layer: "top" as const,
        },
      ],
    })),
  ]
  const hash = await sha256(
    JSON.stringify({ records: collectNoiseGeometryInputs(geometry, "board") }),
  )
  const sourceHash = await sha256(
    JSON.stringify({ sources: configuration.sources }),
  )
  const baselineSourceHash = await sha256(
    JSON.stringify({
      sources: configuration.sources.map((source) =>
        configuration.baseline!.source_names.includes(source.name)
          ? {
              ...source,
              waveform: {
                kind: "dc",
                voltage_v: configuration.baseline!.voltage_v,
              },
            }
          : source,
      ),
    }),
  )
  const victim = compileSource(configuration.sources[1]!.waveform)
  const baseline = Array.from({ length: 9216 }, (_, index) =>
    victim.valueAt((index * ui) / 128),
  )
  const waveforms: Waveform[] = ["total", "baseline", "difference"].map(
    (variant) => ({
      format: "simulation_pcb_noise_waveform_json_v1",
      run_id: "run",
      observation_name: "victim_voltage",
      unit: "V",
      variant: variant as Waveform["variant"],
      full_resolution: true,
      time: {
        kind: "uniform",
        start_s: 0,
        step_s: ui / 128,
        count: baseline.length,
      },
      values: baseline.map((value, index) =>
        variant === "baseline"
          ? value
          : variant === "difference"
            ? 0.06 * Math.sin((2 * Math.PI * index) / 32)
            : value + 0.06 * Math.sin((2 * Math.PI * index) / 32),
      ),
      valid_intervals_s: [
        { start_s: 0, end_s: ((baseline.length - 1) * ui) / 128 },
      ],
      bandwidth_hz: 8e9,
      input_sha256: hash,
      source_sha256: variant === "baseline" ? baselineSourceHash : sourceHash,
      comparison_identity: "same-victim-load-timing",
    }),
  )
  const assetOptions = {
    mimetype: options.gzip
      ? ("application/gzip" as const)
      : ("application/json" as const),
  }
  const waveformAssets = await Promise.all(
    waveforms.map(async (waveform) => ({
      observation_name: waveform.observation_name,
      variant: waveform.variant,
      asset: await createJsonAsset(waveform, {
        projectRelativePath: `${waveform.variant}.json`,
        ...assetOptions,
      }),
    })),
  )
  const spectrum = computeSpectrum(waveforms[0]!, {
    waveform_sha256: waveformAssets[0]!.asset.sha256,
    window: "hann",
    dc_treatment: "mean_removed",
    kind: "psd",
  })
  const spectrumAsset = await createJsonAsset(spectrum, {
    projectRelativePath: "spectrum.json",
    ...assetOptions,
  })
  const eyeAnalysis = analyzeEye(waveforms[0]!, {
    signal_kind: "active_nrz",
    rise_time_s: ui / 8,
    threshold_v: 0.5,
    waveform_sha256: waveformAssets[0]!.asset.sha256,
    timing_sha256: await sha256(canonicalJson(configuration.eyes![0]!.timing)),
    time_bins: 80,
    voltage_bins: 40,
    min_voltage_v: -0.1,
    max_voltage_v: 1.1,
    timing: options.explicitClock
      ? {
          kind: "explicit_clock",
          unit_interval_s: ui,
          sample_offset_s: ui / 2,
          clock_edges_s: Array.from({ length: 72 }, (_, index) => index * ui),
          edge_polarity: "rising",
          symbol_mapping: "one_edge_per_symbol",
          interpretation: "nominal_reference",
          clock_source: { kind: "authored_edges", source_name: "victim" },
        }
      : {
          kind: "known_ui",
          unit_interval_s: ui,
          epoch_s: 0,
          sample_offset_s: ui / 2,
        },
  })
  if (eyeAnalysis.status !== "eye_available")
    throw new Error(eyeAnalysis.reason)
  const eyeAsset = await createJsonAsset(eyeAnalysis.eye, {
    projectRelativePath: "eye.json",
    ...assetOptions,
  })
  const network = {
    format: "simulation_pcb_noise_network_json_v1",
    run_id: "run",
    input_sha256: hash,
    model_sha256: hash,
    ports: configuration.ports.map((port) => ({
      port_name: port.name,
      signal_contact: port.signal_contact,
      reference_contact: port.reference_contact,
      reference_impedance_ohms: 50,
      reference_plane: "physical contact",
      polarity: "signal_minus_reference",
    })),
    frequencies_hz: [0, 8e9],
    representation: "s",
    matrix_units: "dimensionless",
    matrices: [0, 1].map(() => [
      [
        { real: 0, imag: 0 },
        { real: 0, imag: 0 },
      ],
      [
        { real: 0, imag: 0 },
        { real: 0, imag: 0 },
      ],
    ]),
    phasor_convention: "exp_positive_j_omega_t",
    current_sign_convention: "into_pcb",
    dc: { kind: "included" },
    extraction: {
      provider: "analytic-fixture",
      version: "1",
      normalization: "real Z0",
    },
  }
  const networkAsset = await createJsonAsset(network, {
    projectRelativePath: "network.json",
    ...assetOptions,
  })
  const manifest = await buildRunManifest({
    run_id: "run",
    experiment_id: "noise",
    configuration_id: "config",
    board_id: "board",
    inputs: {
      geometry: {
        value: {
          records: JSON.parse(
            JSON.stringify(collectNoiseGeometryInputs(geometry, "board")),
          ),
        },
      },
      configuration: { value: JSON.parse(JSON.stringify(configuration)) },
      sources: {
        value: { sources: JSON.parse(JSON.stringify(configuration.sources)) },
      },
      loads: {
        value: {
          terminations: JSON.parse(JSON.stringify(configuration.terminations)),
        },
      },
    },
    solver: {
      backend: "analytic-fixture",
      version: "1",
      unit_adapter_version: "SI-1",
      settings: {},
    },
    artifacts: [
      manifestArtifact("network", networkAsset),
      ...waveformAssets.map((entry) =>
        manifestArtifact(entry.variant, entry.asset),
      ),
      manifestArtifact("eye", eyeAsset),
      manifestArtifact("spectrum", spectrumAsset),
    ],
  })
  const manifestAsset = await createJsonAsset(manifest, {
    projectRelativePath: "manifest.json",
    ...assetOptions,
  })
  const result = {
    type: "simulation_pcb_noise_result" as const,
    simulation_pcb_noise_result_id: "result",
    simulation_experiment_id: "noise",
    simulation_pcb_noise_configuration_id: "config",
    pcb_board_id: "board",
    run_id: "run",
    status: "completed" as const,
    observation_names: ["victim_voltage"],
    model_tier: "analytic fixture",
    validity_band_hz: { min_hz: 0, max_hz: 8e9 },
    validation: { state: "unvalidated" as const, residuals: [] },
    manifest_asset: manifestAsset,
    network_asset: networkAsset,
    waveform_assets: waveformAssets,
    eye_assets: [{ observation_name: "victim_voltage", asset: eyeAsset }],
    spectrum_assets: [
      { observation_name: "victim_voltage", asset: spectrumAsset },
    ],
  }
  const externalBytes = new Map<string, Uint8Array>()
  if (options.external) {
    for (const descriptor of [
      manifestAsset,
      networkAsset,
      ...waveformAssets.map((entry) => entry.asset),
      eyeAsset,
      spectrumAsset,
    ]) {
      externalBytes.set(
        descriptor.asset.project_relative_path,
        Uint8Array.from(
          atob(descriptor.asset.url.split(",")[1]!),
          (character) => character.charCodeAt(0),
        ),
      )
      descriptor.asset.url = `https://example.invalid/${descriptor.asset.project_relative_path}`
    }
  }
  const circuit: AnyCircuitElement[] = [
    ...geometry,
    {
      type: "simulation_experiment",
      simulation_experiment_id: "noise",
      name: "Analytic noise fixture",
      experiment_type: "pcb_noise",
    },
    configuration,
    result,
  ]
  return { circuit, result, configuration, manifest, externalBytes }
}
