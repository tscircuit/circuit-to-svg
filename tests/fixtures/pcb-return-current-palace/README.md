# Real 100 MHz Palace snapshot fixture

![Actual Palace current over its PCB](../../pcb/__snapshots__/pcb-return-current.snap.svg)

`result.circuit.json` is unmodified output from a completed Palace v0.14.0
frequency-domain Maxwell solve at **100 MHz, 5 mA peak**. The visual snapshot
in `tests/pcb/pcb-return-current.test.ts` loads its embedded gzip field through
`convertCircuitJsonToPcbSimulationSvg`. Synthetic grids in that test cover
numerical edge cases; they do not supply this visual snapshot.

The source is the [CLI integration fixture](https://github.com/tscircuit/return-current-trace-demo/tree/main/examples/circuit-json).
The result's SHA-256 is
`f866edb7806bfda6f0879f935a8dbf6bf0332d46e57d9393f2c227aa9e8b05dd`.
The copied input, validation receipt, model, actual solver configuration/log,
terminal CSVs, normalization data and surface-sampling receipt document its
origin. This generated fixture directory is excluded from automatic formatting
to retain the original exported bytes and validation hashes.

The same 8 × 6 mm two-layer PCB has a top signal trace, bottom GND plane,
separate signal/GND terminals and actual plated GND vias. The 25/100 Ω ports,
35 µm copper foil/plating and conductivity of 5.8 × 10⁷ S/m are unchanged.
The output cell size is **0.05 mm**, reduced from the earlier 0.1 mm fixture:
160 × 120 cells, with 19,176 finite complex conductor samples and 24 masked
drill cells. The solve uses a 1 mm FEM mesh target, second-order elements,
45,493 tetrahedra and 314,698 unknowns.

The copper model is explicitly **finite-conductivity surface impedance**.
At 100 MHz the 35 µm copper is about 5.3 skin depths thick. Palace meshes the
air/substrate and applies its frequency-dependent conductivity boundary to
the copper exterior. The importer sums complex currents from the actual
exposed bottom-plane foil faces, retaining their physical signs, then applies
the declared source-current normalization. A buried via junction can have
only one exposed foil face. No missing conductor samples are filled or
extrapolated.

Stored sheet current K is in A/mm, with peak phasors using exp(+jωt).
Displayed |K|/0.035 mm is equivalent foil-average density, not local peak
volumetric density in a skin layer. The snapshot shows the real PCB,
selected trace and actual terminals, current-direction arrows at the
excitation's positive peak, and a full-range 0–0.21 A/mm² scale. There is no
public phase-angle control.

To repeat the physical run, build the CLI from
[simulate-return-current #16](https://github.com/tscircuit/simulate-return-current/pull/16),
install its Python dependencies, and run from this directory:

```sh
node /path/to/simulate-return-current/dist/cli.js input.circuit.json \
  --experiment-id simulation_experiment_explicit_port_100mhz \
  --frequency-hz 100000000 --copper-model surface_impedance \
  --sample-layer bottom --cell-size 0.05 --mesh-size 1 --order 2 \
  --air-padding 2 --processes 4 --output /tmp/pcb-return-current-palace \
  --result-json /tmp/pcb-return-current-palace.result.circuit.json \
  --result-id simulation_pcb_return_current_result_explicit_port_100mhz
```

Docker or native Palace is required for a new solve. The renderer test uses
the checked result and requires neither. The pinned image, physical
assumptions, SI terminal results, sampling method and hashes are recorded
in `validation.json` and `evidence/`.

This is real EM output for a renderer integration test. Mesh/domain/local
density convergence has not been established, particularly near via walls,
edges and contacts. The smaller output cells improve sampling resolution
independently of FEM resolution.
