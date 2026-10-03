import { expect, test } from "bun:test"
import { pcb_solder_paste } from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSolderPasteMask,
} from "lib"

test("polygon paste previews preserve concavity, holes and layer filtering", () => {
  const paste = pcb_solder_paste.parse({
    type: "pcb_solder_paste",
    shape: "polygon",
    layer: "bottom",
    points: [
      { x: 10, y: -5 },
      { x: 14, y: -5 },
      { x: 14, y: -3 },
      { x: 13, y: -3 },
      { x: 13, y: -1 },
      { x: 10, y: -1 },
    ],
    holes: [
      [
        { x: 11, y: -4 },
        { x: 12, y: -4 },
        { x: 12, y: -2 },
        { x: 11, y: -2 },
      ],
    ],
  })
  const mask = convertCircuitJsonToSolderPasteMask([paste], {
    layer: "bottom",
    includeVersion: false,
  })
  expect(mask).toContain('fill-rule="evenodd"')
  expect(mask).not.toContain("NaN")
  expect(mask).toMatchSvgSnapshot(import.meta.path)
  const pcb = convertCircuitJsonToPcbSvg([paste], {
    showSolderPaste: true,
    layer: "bottom",
    includeVersion: false,
  })
  expect(pcb).toMatchSvgSnapshot(import.meta.path + ".pcb")
  expect(pcb).not.toContain("NaN")
  expect(pcb).toContain('data-type="pcb_solder_paste"')
  expect(
    convertCircuitJsonToPcbSvg([paste], { showSolderPaste: false }),
  ).not.toContain('data-type="pcb_solder_paste"')
  expect(
    convertCircuitJsonToSolderPasteMask([paste], { layer: "top" }),
  ).not.toContain('data-type="pcb_solder_paste"')
})
