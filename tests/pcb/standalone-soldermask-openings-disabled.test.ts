import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit, options } from "../fixtures/standalone-soldermask-openings"

test("mask geometry is invisible when mask rendering is disabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    ...options,
    layer: "top",
    showSolderMask: false,
  })
  const withoutOpenings = convertCircuitJsonToPcbSvg(
    circuit.filter((element) => element.type !== "pcb_soldermask_opening"),
    { ...options, layer: "top", showSolderMask: false },
  )
  expect(svg).toBe(withoutOpenings)
})
