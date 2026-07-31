import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { solderPastePcbViewFixture } from "./fixtures/solder-paste-pcb-view-fixture"

test("showSolderPaste renders solder paste in the pcb view", () => {
  const svg = convertCircuitJsonToPcbSvg(solderPastePcbViewFixture, {
    showSolderPaste: true,
  })
  expect(svg).toContain("pcb-solder-paste")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
