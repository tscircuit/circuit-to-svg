import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbNoiseSvg } from "lib"
import { previewEnvelope } from "lib/sim/pcb-noise/preview-envelope"
import { pcbNoiseFixture } from "../fixtures/pcb-noise"
import { simulation_pcb_noise_waveform_json } from "circuit-json"
import {
  loadNoiseAsset,
  createJsonAsset,
  manifestArtifact,
} from "simulate-pcb-noise"

const selection = {
  simulationResultId: "result",
  observationName: "victim_voltage",
  width: 1000,
  height: 500,
}

for (const view of ["waveform", "spectrum", "eye", "pcb"] as const) {
  test(`selected PCB noise ${view}`, async () => {
    const { circuit } = await pcbNoiseFixture()
    const original = JSON.stringify(circuit)
    const svg = await convertCircuitJsonToPcbNoiseSvg(circuit, {
      ...selection,
      view,
    })
    expect(svg).toMatchSvgSnapshot(import.meta.path, `pcb-noise-${view}`)
    expect(JSON.stringify(circuit)).toBe(original)
  })
}

test("explicit clock eye displays its timing reference", async () => {
  const { circuit } = await pcbNoiseFixture({ explicitClock: true })
  const svg = await convertCircuitJsonToPcbNoiseSvg(circuit, {
    ...selection,
    view: "eye",
  })
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-noise-explicit-clock-eye",
  )
})

test("physical terminal labels fit a close viewport", async () => {
  const fixture = await pcbNoiseFixture()
  const svg = await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    view: "pcb",
    viewport: { minX: -4, maxX: 4, minY: -2.5, maxY: -0.5 },
    drawPaddingOutsideBoard: false,
  })
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-noise-edge-contact-label",
  )
})

test("compact nonnegative spectrum keeps provider and axis labels visible", async () => {
  const fixture = await pcbNoiseFixture()
  fixture.result.model_tier =
    "analytic_fixture_with_a_long_explicit_provider_identity"
  const svg = await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    width: 400,
    height: 240,
    view: "spectrum",
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-noise-compact-spectrum")
})

test("selected external gzip assets use only the explicit resolver", async () => {
  const fixture = await pcbNoiseFixture({ gzip: true, external: true })
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "spectrum",
    }),
  ).rejects.toThrow("explicit resolver")
  const reads: string[] = []
  const svg = await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    view: "spectrum",
    resolveAsset: async (asset) => {
      reads.push(asset.project_relative_path)
      return fixture.externalBytes.get(asset.project_relative_path)!
    },
  })
  expect(reads).toEqual(["manifest.json", "spectrum.json"])
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-noise-spectrum")
})

test("stale hashes and aggregate limits fail before selected data resolution", async () => {
  const fixture = await pcbNoiseFixture({ external: true })
  const reads: string[] = []
  const resolveAsset = async (asset: { project_relative_path: string }) => {
    reads.push(asset.project_relative_path)
    return fixture.externalBytes.get(asset.project_relative_path)!
  }
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "waveform",
      resolveAsset,
      expectedGeometryHash: "0".repeat(64),
    }),
  ).rejects.toThrow("geometry hash")
  expect(reads).toEqual(["manifest.json"])
  reads.length = 0
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "waveform",
      resolveAsset,
      limits: { decodedBytes: 100 },
    }),
  ).rejects.toThrow("aggregate")
  expect(reads).toEqual([])
  fixture.result.spectrum_assets[0]!.asset.encoded_sha256 = "0".repeat(64)
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "spectrum",
      resolveAsset,
    }),
  ).rejects.toThrow("missing from its run manifest")
})

test("requires exact selection and total waveform identity", async () => {
  const fixture = await pcbNoiseFixture()
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      observationName: "missing",
      view: "waveform",
    }),
  ).rejects.toThrow("exactly one selected noise observation")
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "spectrum",
      spectrumKind: "amplitude_peak",
    }),
  ).rejects.toThrow("normalization")
  fixture.result.waveform_assets[0]!.asset.sha256 = "0".repeat(64)
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "eye",
    }),
  ).rejects.toThrow("missing from its run manifest")
})

test("analysis reference descriptors must be attested without resolving waveform data", async () => {
  for (const view of ["eye", "spectrum"] as const) {
    const fixture = await pcbNoiseFixture({ external: true })
    fixture.result.waveform_assets[0]!.asset.sha256 = "0".repeat(64)
    const reads: string[] = []
    await expect(
      convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
        ...selection,
        view,
        resolveAsset: async (asset) => {
          reads.push(asset.project_relative_path)
          return fixture.externalBytes.get(asset.project_relative_path)!
        },
      }),
    ).rejects.toThrow("missing from its run manifest")
    expect(reads).toEqual(["manifest.json"])
  }
})

test("display envelope preserves narrow extrema in order", () => {
  const x = Array.from({ length: 1000 }, (_, index) => index)
  const values = x.map((index) => (index === 431 ? 10 : index === 432 ? -8 : 0))
  const preview = previewEnvelope(x, values, 50)
  expect(preview.values).toContain(10)
  expect(preview.values).toContain(-8)
  expect(preview.x).toEqual([...preview.x].sort((a, b) => a - b))
  expect(preview.x.length).toBeLessThanOrEqual(102)
})

test("edits to current physical, source and load inputs reject old results", async () => {
  for (const input of ["geometry", "seed", "load"] as const) {
    const fixture = await pcbNoiseFixture({ external: true })
    const board = fixture.circuit.find(
      (element) => element.type === "pcb_board",
    )!
    if (input === "geometry" && board.type === "pcb_board")
      board.thickness = 1.7
    if (input === "seed") {
      const source = fixture.configuration.sources[1]!
      if (source.waveform.kind === "prbs") source.waveform.seed = 3
    }
    if (input === "load")
      fixture.configuration.terminations[0]!.model.resistance_ohms = 100
    const reads: string[] = []
    await expect(
      convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
        ...selection,
        view: "waveform",
        resolveAsset: async (asset) => {
          reads.push(asset.project_relative_path)
          return fixture.externalBytes.get(asset.project_relative_path)!
        },
      }),
    ).rejects.toThrow("Stale noise result")
    expect(reads).toEqual(["manifest.json"])
  }
})

test("unselected noise experiments and bottom contact visibility are preserved", async () => {
  const fixture = await pcbNoiseFixture()
  fixture.circuit.push(
    {
      type: "simulation_experiment",
      simulation_experiment_id: "other",
      name: "Other noise run",
      experiment_type: "pcb_noise",
    },
    {
      ...fixture.configuration,
      simulation_pcb_noise_configuration_id: "other-config",
      simulation_experiment_id: "other",
    },
    {
      ...fixture.result,
      simulation_pcb_noise_result_id: "other-result",
      simulation_experiment_id: "other",
      simulation_pcb_noise_configuration_id: "other-config",
      run_id: "other-run",
    },
  )
  const original = JSON.stringify(fixture.circuit)
  await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    view: "waveform",
  })
  expect(JSON.stringify(fixture.circuit)).toBe(original)
  const svg = await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    view: "pcb",
    layer: "bottom",
  })
  expect(svg).not.toContain("simulation_pcb_noise_contact")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-noise-bottom-contact-visibility",
  )
})

test("physical capture gaps stay disconnected in one waveform legend", async () => {
  const fixture = await pcbNoiseFixture()
  const waveform = simulation_pcb_noise_waveform_json.parse(
    await loadNoiseAsset(fixture.result.waveform_assets[0]!.asset),
  )
  const indices = waveform.values.flatMap((_, index) =>
    index < 3072 || index >= 6144 ? [index] : [],
  )
  const times = indices.map(
    (index) => index * fixture.configuration.sample_interval_s,
  )
  waveform.values = indices.map((index) => waveform.values[index]!)
  waveform.time = { kind: "explicit", times_s: times }
  waveform.valid_intervals_s = [
    { start_s: times[0]!, end_s: times[3071]! },
    { start_s: times[3072]!, end_s: times.at(-1)! },
  ]
  const descriptor = await createJsonAsset(waveform, {
    projectRelativePath: "gapped-total.json",
  })
  fixture.result.waveform_assets = [
    { observation_name: "victim_voltage", variant: "total", asset: descriptor },
  ]
  fixture.result.eye_assets = []
  fixture.result.spectrum_assets = []
  fixture.result.manifest_asset = await createJsonAsset(
    {
      ...fixture.manifest,
      artifacts: [
        manifestArtifact("network", fixture.result.network_asset),
        manifestArtifact("total", descriptor),
      ],
    },
    { projectRelativePath: "manifest.json" },
  )
  const svg = await convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
    ...selection,
    view: "waveform",
    waveformVariants: ["total"],
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-noise-capture-gap")
})

test("hash-valid waveform assets still require the observation's physical units", async () => {
  const fixture = await pcbNoiseFixture()
  const waveform = simulation_pcb_noise_waveform_json.parse(
    await loadNoiseAsset(fixture.result.waveform_assets[0]!.asset),
  )
  waveform.unit = "A"
  const descriptor = await createJsonAsset(waveform, {
    projectRelativePath: "wrong-units.json",
  })
  fixture.result.waveform_assets = [
    { observation_name: "victim_voltage", variant: "total", asset: descriptor },
  ]
  fixture.result.eye_assets = []
  fixture.result.spectrum_assets = []
  fixture.result.manifest_asset = await createJsonAsset(
    {
      ...fixture.manifest,
      artifacts: [
        manifestArtifact("network", fixture.result.network_asset),
        manifestArtifact("total", descriptor),
      ],
    },
    { projectRelativePath: "manifest.json" },
  )
  await expect(
    convertCircuitJsonToPcbNoiseSvg(fixture.circuit, {
      ...selection,
      view: "waveform",
      waveformVariants: ["total"],
    }),
  ).rejects.toThrow("units do not match")
})
