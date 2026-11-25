import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import base64Font from "@tscircuit/alphabet/base64font"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

test("Node renders a saved 200,001-sample waveform", async () => {
  const directory = await mkdtemp(join(tmpdir(), "simulation-graph-node-"))
  try {
    const modulePath = join(directory, "renderer.mjs")
    const svgPath = join(directory, "graph.svg")
    const fontPath = join(directory, "alphabet.ttf")
    const build = await Bun.build({
      entrypoints: [
        join(
          import.meta.dir,
          "../../lib/sim/convert-circuit-json-to-simulation-graph-svg.ts",
        ),
      ],
      target: "node",
    })
    expect(build.success).toBe(true)
    await writeFile(modulePath, await build.outputs[0]!.text())
    // Bun uses JavaScriptCore, which does not reproduce V8's argument limit.
    const script = `
      import { writeFileSync } from "node:fs";
      import { convertCircuitJsonToSimulationGraphSvg } from ${JSON.stringify(pathToFileURL(modulePath).href)};
      const count = 200_001;
      const voltageLevels = Array.from({ length: count }, (_, i) => 5 * i / (count - 1));
      voltageLevels[90_000] = -2;
      voltageLevels[150_000] = 7;
      try {
        const svg = convertCircuitJsonToSimulationGraphSvg({
          width: 1000, height: 480, includeVersion: false,
          simulation_experiment_id: "saved_waveform",
          circuitJson: [{
            type: "simulation_experiment",
            simulation_experiment_id: "saved_waveform",
            name: "VOUT: all samples, including narrow extrema",
            experiment_type: "spice_transient_analysis",
            start_time_ms: 0, end_time_ms: 10,
          }, {
            type: "simulation_transient_voltage_graph",
            simulation_transient_voltage_graph_id: "vout",
            simulation_experiment_id: "saved_waveform",
            name: "VOUT", start_time_ms: 0, end_time_ms: 10,
            time_per_step: 0.00005, voltage_levels: voltageLevels,
          }],
        });
        writeFileSync(${JSON.stringify(svgPath)}, svg);
        console.log(JSON.stringify({
          samples: (svg.match(/class="simulation-point"/g) ?? []).length,
          invalidCoordinates: /NaN|Infinity/.test(svg),
        }));
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        console.log(JSON.stringify({ error: error.name + ": " + error.message }));
      }
    `
    const child = Bun.spawn(["node", "--input-type=module", "-e", script], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    })
    const stdout = await new Response(child.stdout).text()
    const stderr = await new Response(child.stderr).text()
    expect(await child.exited).toBe(0)
    expect(stderr).toBe("")
    const result = JSON.parse(stdout)
    expect(result).toEqual({
      error: "RangeError: Maximum call stack size exceeded",
    })

    let graph = `<text x="40" y="240" fill="#b91c1c" font-size="22">${result.error}</text>`
    if (!result.error) graph = await readFile(svgPath, "utf8")
    const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="590">
      <rect width="1000" height="590" fill="white"/>
      <g font-family="TscircuitAlphabet" fill="#111827">
        <text x="28" y="30" font-size="20">Saved waveform input: 200,001 samples over 0 to 10 ms</text>
        <text x="28" y="58" font-size="16">0 to 5 V ramp; sample 90,000 = -2 V; sample 150,000 = 7 V</text>
        <text x="28" y="86" font-size="16">Actual Node renderer result:</text>
      </g>
      <svg y="110" width="1000" height="480">${graph}</svg>
    </svg>`
    // Rasterize the complete SVG so the committed preview is small. Rendering
    // and the sample-count assertion above still use every original sample.
    await writeFile(fontPath, Buffer.from(base64Font, "base64"))
    const png = new Resvg(preview, {
      font: {
        loadSystemFonts: false,
        fontFiles: [fontPath],
        defaultFontFamily: "TscircuitAlphabet",
        sansSerifFamily: "TscircuitAlphabet",
      },
    })
      .render()
      .asPng()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="590"><image width="1000" height="590" href="data:image/png;base64,${png.toString("base64")}"/></svg>`
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 20_000)
