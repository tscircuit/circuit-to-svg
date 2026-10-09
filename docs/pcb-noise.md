# Selected PCB noise plots

`convertCircuitJsonToPcbNoiseSvg` renders one completed noise run and one
experiment-local observation. It requires the Circuit JSON physical noise
contract and the browser-safe `simulate-pcb-noise` asset helpers.

```ts
import { convertCircuitJsonToPcbNoiseSvg } from "circuit-to-svg"

const svg = await convertCircuitJsonToPcbNoiseSvg(circuitJson, {
  simulationResultId: "simulation_pcb_noise_result_run_1",
  observationName: "victim_far_voltage",
  view: "waveform", // "spectrum", "eye", or "pcb"
  resolveAsset: async (asset) => fetch(asset.url).then((response) =>
    response.arrayBuffer().then((bytes) => new Uint8Array(bytes))),
})
```

External IO occurs only through the supplied resolver. Embedded JSON and gzip
work without one. The renderer reads the run manifest and only the selected
view's assets, checks exact/canonical hashes and current physical/configuration/
source/load identities, and enforces cumulative byte and channel limits.
Spectrum/eye hashes must identify the selected total waveform; eye timing must
match the authored reference. Failed, unsupported, missing and stale selections
throw explicit errors. Unrelated experiments remain intact.

Waveforms display all available total/baseline/difference variants, or the
explicit `waveformVariants` selection. Full-resolution data is validated before
a display-only extrema envelope is generated; physical gaps remain separate
paths. SI seconds convert once to the legacy millisecond graph contract, with
nanosecond display labels. Spectrum labels retain units, normalization, window,
DC treatment and ENBW; `spectrumKind` can require a specific normalization.
Spectrum magnitude/PSD axes start at zero, and long provider labels fit the viewport.

Eyes use the persisted voltage-major histogram without timing realignment and
show known-UI or explicit-clock interpretation. Their compact paths use 16
square-root occupancy levels; counts and finite-record metrics remain unchanged.
PCB views highlight the selected physical signal/reference contacts, fit their
labels inside the viewport and respect layer selection. No spatial voltage or
solved-current field is invented.
