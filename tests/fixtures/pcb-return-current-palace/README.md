# Palace return-current snapshot fixture

`result.circuit.json` is the unmodified output of a real Palace v0.14.0
frequency-domain EM run. The visual snapshot in
`tests/pcb/pcb-return-current.test.ts` loads its embedded gzip field through
`convertCircuitJsonToPcbSimulationSvg`; it does not construct field values in
the test. Synthetic grids in that test remain focused fixtures for numerical
edge cases.

The source is the [completed CLI integration run](https://github.com/tscircuit/return-current-trace-demo/tree/7d929239e62b46d0c790eb490c9dffb3db9bfdbd/examples/circuit-json).
The source result's SHA-256 is
`5c5835053fce9073d26a143cc03b43cf485fe327cf7604a22ea24fa802cb6c3f`.
`input.circuit.json`, `validation.json`, and `evidence/` are copied from that
run. Evidence includes the actual solver configuration and log, mesh counts,
resolved model, and raw terminal voltage/current CSVs. `validation.json`
records the applied source-current normalization and the source repository's
rendered-image hashes; those image hashes are not this repository's snapshot.

The two-layer 8 × 6 mm board has a top-layer signal trace and a bottom GND
plane. Source and load each use separate signal/GND pads, with plated GND vias
joining the reference pads to the plane. The solve uses **1 MHz, 5 mA peak**,
25 Ω source-reference resistance, and a 100 Ω load. The 80 × 60 sampled field
has 4,792 finite complex cells and eight masked via-drill cells. Sheet current
is in A/mm with peak phasors using exp(+jωt); the renderer uses the stored
0.035 mm copper thickness to display A/mm².

The snapshot shows the real PCB, selected signal, distinct terminal markers,
phase-0° arrows, and an explicit 0–0.04 A/mm² color scale. Its data comes from
the decoded field, even though the result also contains an embedded PNG.

To repeat the physical run, build the CLI from
[simulate-return-current #16](https://github.com/tscircuit/simulate-return-current/pull/16),
install its Python dependencies, and run from this fixture directory:

```sh
node /path/to/simulate-return-current/dist/cli.js input.circuit.json \
  --experiment-id simulation_experiment_explicit_port_1mhz \
  --frequency-hz 1000000 --sample-layer bottom \
  --cell-size 0.1 --mesh-size 2 --order 1 --air-padding 2 --processes 4 \
  --output /tmp/pcb-return-current-palace \
  --result-json /tmp/pcb-return-current-palace.result.circuit.json \
  --result-id simulation_pcb_return_current_result_explicit_port_1mhz
```

Docker or a native Palace binary is required. The pinned image digest and
physical parameters are recorded in `validation.json`. The renderer test
uses the checked result and requires neither Palace nor Docker.

This is a coarse first-order integration fixture: the sampled return-current
cross-section differs from the source current by about 16%. It demonstrates
rendering actual EM output; it is not evidence of mesh convergence or DDR
operating accuracy.
