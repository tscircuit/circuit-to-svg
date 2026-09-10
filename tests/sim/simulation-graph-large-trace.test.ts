import { expect, test } from "bun:test"
import { mkdtemp, rm, rmdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { buildAxisInfo } from "lib/sim/simulation-graph-svg/create-axes/build-axis-info"

test("large simulation retains extrema regardless of sample order", () => {
  const values = new Array(250_000).fill(1)
  values[123_456] = -2
  values[234_567] = 4
  const axis = buildAxisInfo(values)
  expect(axis.domainMin).toBeLessThanOrEqual(-2)
  expect(axis.domainMax).toBeGreaterThanOrEqual(4)
  expect(axis.ticks).toContain(-2)
  expect(axis.ticks).toContain(4)
})

test("Node renders a 250,000-sample transient without exceeding the argument limit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "circuit-svg-large-trace-"))
  const modulePath = join(directory, "simulation.mjs")
  try {
    const build = await Bun.build({
      entrypoints: [
        fileURLToPath(
          new URL(
            "../../lib/sim/convert-circuit-json-to-simulation-graph-svg.ts",
            import.meta.url,
          ),
        ),
      ],
      target: "node",
    })
    expect(build.success).toBe(true)
    await writeFile(modulePath, await build.outputs[0]!.text())
    const script = `
      import { convertCircuitJsonToSimulationGraphSvg } from ${JSON.stringify(pathToFileURL(modulePath).href)};
      const count = 250_000;
      const svg = convertCircuitJsonToSimulationGraphSvg({
        simulation_experiment_id: "large-trace",
        circuitJson: [{
          type: "simulation_transient_voltage_graph",
          simulation_transient_voltage_graph_id: "voltage",
          simulation_experiment_id: "large-trace",
          start_time_ms: 0,
          end_time_ms: 1,
          time_per_step: 1 / (count - 1),
          voltage_levels: Array.from({ length: count }, (_, i) => i / (count - 1)),
        }],
      });
      console.log(JSON.stringify({
        samples: (svg.match(/class="simulation-point"/g) ?? []).length,
        hasGraph: svg.includes('data-simulation-transient-voltage-graph-id="voltage"'),
        invalidCoordinate: /NaN|Infinity/.test(svg),
      }));
    `
    const result = Bun.spawnSync(
      ["node", "--input-type=module", "-e", script],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    expect(result.stderr.toString()).toBe("")
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout.toString())).toEqual({
      samples: 250_000,
      hasGraph: true,
      invalidCoordinate: false,
    })
  } finally {
    await rm(modulePath, { force: true })
    await rmdir(directory)
  }
})
