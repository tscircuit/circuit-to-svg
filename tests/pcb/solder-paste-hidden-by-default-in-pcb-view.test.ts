import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { solderPastePcbViewFixture } from "./fixtures/solder-paste-pcb-view-fixture"

test("solder paste stays hidden in the pcb view by default", () => {
  const svg = convertCircuitJsonToPcbSvg(solderPastePcbViewFixture)
  expect(svg).not.toContain("pcb-solder-paste")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
