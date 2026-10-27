import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import type { AnyCircuitElement, PcbCopperPourStyleWarning } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import detectedWarnings from "../assets/am3352-pour-style-warnings.json"

// Complete published board, byte-for-byte, compressed only for repository size:
// https://am3352-six-layer-routing-proof.seveibar.chatgpt.site/am3352/circuit.json.gz
const originalJson = gunzipSync(
  readFileSync(
    new URL("../assets/am3352-six-layer.circuit.json.gz", import.meta.url),
  ),
)
const board = JSON.parse(originalJson.toString()) as AnyCircuitElement[]
const warnings = detectedWarnings as PcbCopperPourStyleWarning[]
// Keep every original geometry record. Hide pre-existing unrelated diagnostics
// so the snapshot isolates the newly supported pour style warnings.
const circuit = [
  ...board.filter((element) => !element.type.endsWith("_warning")),
  ...warnings,
]
const options = { width: 1400, height: 1160, layer: "inner1" as const }
const warningSelector = 'class="pcb-copper-pour-style-warning"'

test("native warning highlights on the complete AM3352 inner1 layer", () => {
  expect(createHash("sha256").update(originalJson).digest("hex")).toBe(
    "102347c87209faf6600229e7a5ec533b5eb90839cd904629457bd9a61e1dab02",
  )
  expect(
    board.filter((element) => element.type === "pcb_copper_pour"),
  ).toHaveLength(323)
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    ...options,
    shouldDrawWarnings: true,
  })
  expect(svg.split(warningSelector).length - 1).toBe(105)
  expect(svg).toContain('data-pcb-copper-pour-id="plane_inner1_68"')
  expect(svg).toContain("Copper pour for GND has an isolated island on inner1")
  expect(svg).toContain('fill-rule="evenodd"')
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "am3352-inner1-pour-warnings",
  )
}, 30_000)

test("AM3352 pour warnings are opt-in and respect the selected layer", () => {
  const hidden = convertCircuitJsonToPcbSvg(circuit, options)
  expect(hidden).not.toContain(warningSelector)
  expect(
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      shouldDrawWarnings: false,
    }),
  ).toBe(hidden)
  expect(hidden).toMatchSvgSnapshot(
    import.meta.path,
    "am3352-inner1-warnings-hidden",
  )
  const otherLayer = convertCircuitJsonToPcbSvg(circuit, {
    ...options,
    layer: "inner2",
    shouldDrawWarnings: true,
  })
  expect(otherLayer).not.toContain(warningSelector)
  expect(otherLayer).toMatchSvgSnapshot(
    import.meta.path,
    "am3352-inner2-no-pour-warnings",
  )
}, 30_000)

test("missing targets and mismatched warning layers do not highlight unrelated copper", () => {
  const inner1 = warnings.find((warning) => warning.layer === "inner1")!
  for (const warning of [
    { ...inner1, pcb_copper_pour_id: "missing_pour" },
    { ...inner1, layer: "inner2" as const },
  ]) {
    const svg = convertCircuitJsonToPcbSvg(
      [...board.filter((e) => !e.type.endsWith("_warning")), warning],
      {
        ...options,
        shouldDrawWarnings: true,
      },
    )
    expect(svg).not.toContain(warningSelector)
  }
}, 30_000)
