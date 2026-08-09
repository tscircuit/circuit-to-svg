import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSolderPasteMask,
} from "lib"

// Regression: an oval `pcb_solder_paste` element is valid circuit-json (it is a
// member of the pcb_solder_paste union) but had no renderer branch, so
// createSvgObjectsFromSolderPaste returned undefined. That undefined was pushed
// into the svg object list and later crashed sortSvgObjectsByPcbLayer with
// "undefined is not an object (evaluating 'object.attributes')".
const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_top",
    pcb_component_id: "component0",
    layer: "top",
    shape: "rect",
    x: 0,
    y: 0,
    width: 3,
    height: 1.6,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste_oval",
    pcb_component_id: "component0",
    layer: "top",
    shape: "oval",
    x: 0,
    y: 0,
    width: 2.6,
    height: 1.2,
  },
]

test("oval solder paste does not crash and renders an ellipse", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showSolderPaste: true,
  })

  expect(svg).toContain('data-type="pcb_solder_paste"')
  expect(svg).toContain("<ellipse")
  expect(svg).not.toContain("NaN")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("oval solder paste renders in the solder paste mask", () => {
  const svg = convertCircuitJsonToSolderPasteMask(circuitJson, {
    layer: "top",
  })

  expect(svg).toContain('data-type="pcb_solder_paste"')
  expect(svg).toContain("<ellipse")
})
