import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  boardViaTentingCircuit,
  boardViaTentingViewLabel,
} from "./pcb-via-board-tenting.fixture"

test("panel vias inherit their own board defaults and preserve explicit overrides", () => {
  const topCircuit = [
    ...boardViaTentingCircuit,
    { ...boardViaTentingViewLabel, text: "TOP VIEW - soldermask ON" },
  ]
  const original = structuredClone(topCircuit)
  const top = convertCircuitJsonToPcbSvg(topCircuit, {
    layer: "top",
    showSolderMask: true,
    width: 1440,
    height: 540,
  })
  const bottom = convertCircuitJsonToPcbSvg(
    [
      ...boardViaTentingCircuit,
      { ...boardViaTentingViewLabel, text: "BOTTOM VIEW - soldermask ON" },
    ],
    { layer: "bottom", showSolderMask: true, width: 1440, height: 540 },
  )

  expect(top.match(/class="pcb-via-tenting"/g)).toHaveLength(6)
  expect(bottom.match(/class="pcb-via-tenting"/g)).toHaveLength(7)
  expect(top.match(/class="pcb-hole-inner"/g)).toHaveLength(16)
  expect(bottom.match(/class="pcb-hole-inner"/g)).toHaveLength(16)
  expect(topCircuit).toEqual(original)

  const snapshot = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080">${top}<g transform="translate(0 540)">${bottom}</g></svg>`
  expect(snapshot).toMatchSvgSnapshot(import.meta.path)
})
