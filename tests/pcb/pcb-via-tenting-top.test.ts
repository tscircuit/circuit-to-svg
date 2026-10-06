import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  viaTentingCircuit,
  viaTentingViewLabel,
} from "./pcb-via-tenting.fixture"

test("top view shows per-side tenting only with soldermask enabled", () => {
  const circuit = [
    ...viaTentingCircuit,
    { ...viaTentingViewLabel, text: "TOP VIEW - Soldermask enabled" },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    layer: "top",
    showSolderMask: true,
    width: 1200,
    height: 320,
  })
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-tenting-top-soldermask",
  )

  const copper = convertCircuitJsonToPcbSvg(circuit, {
    layer: "top",
    showSolderMask: false,
  })
  expect(copper).not.toContain('class="pcb-via-tenting"')
})
