import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  viaTentingCircuit,
  viaTentingViewLabel,
} from "./pcb-via-tenting.fixture"

test("bottom view shows bottom-only and both-side tenting", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      ...viaTentingCircuit,
      { ...viaTentingViewLabel, text: "BOTTOM VIEW - Soldermask enabled" },
    ],
    { layer: "bottom", showSolderMask: true, width: 1200, height: 320 },
  )
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-tenting-bottom-soldermask",
  )
})
