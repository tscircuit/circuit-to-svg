import { $ } from "bun"
import { expect, test } from "bun:test"
import { copyFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { dependencies, peerDependencies } from "../package.json"
import { getTestFixture } from "./fixtures/get-test-fixture"

test("renders a schematic with the declared minimum peer versions", async () => {
  const { circuit } = getTestFixture()
  circuit.add(<chip name="U1" pinLabels={{ pin1: "IN", pin2: "OUT" }} />)
  circuit.render()

  const minimumPeers = Object.fromEntries(
    Object.entries(peerDependencies).map(([name, range]) => {
      expect(range).toMatch(/^>=\d+\.\d+\.\d+$/)
      return [name, range.slice(2)]
    }),
  )
  const directory = await mkdtemp(join(tmpdir(), "svg-peers-"))
  try {
    const manifest = {
      type: "module",
      dependencies: { ...dependencies, ...minimumPeers },
    }
    await Bun.write(join(directory, "package.json"), JSON.stringify(manifest))
    await copyFile("dist/index.js", join(directory, "index.js"))
    await $`bun install --ignore-scripts`.cwd(directory).quiet()

    const render = `
      import { convertCircuitJsonToSchematicSvg } from "./index.js"
      const circuitJson = JSON.parse(process.argv[1])
      process.stdout.write(convertCircuitJsonToSchematicSvg(circuitJson, { includeVersion: false }))
    `
    const input = JSON.stringify(circuit.getCircuitJson())
    const svg = await $`node --input-type=module -e ${render} ${input}`
      .cwd(directory)
      .text()
    expect(svg).toMatchSvgSnapshot(import.meta.path)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 20_000)
