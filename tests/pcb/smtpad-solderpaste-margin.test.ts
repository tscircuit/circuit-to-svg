import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSolderPasteMask,
} from "lib"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "fallback_pad",
    shape: "rect",
    layer: "top",
    x: -2,
    y: 0,
    width: 2,
    height: 1,
    solderpaste_margin: -0.1,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "explicit_pad",
    shape: "rect",
    layer: "top",
    x: 2,
    y: 0,
    width: 2,
    height: 1,
    solderpaste_margin: -0.2,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "explicit_paste",
    pcb_smtpad_id: "explicit_pad",
    shape: "rect",
    layer: "top",
    x: 2,
    y: 0,
    width: 0.5,
    height: 0.25,
  },
] as any

test("solder paste mask uses pad margin only when explicit paste is absent", () => {
  const svg = convertCircuitJsonToSolderPasteMask(circuitJson, {
    layer: "top",
  })

  expect(svg.match(/class="pcb-solder-paste"/g)).toHaveLength(2)
  expect(svg).toContain('data-pcb-smtpad-id="fallback_pad"')
  expect(svg).not.toContain('data-pcb-smtpad-id="explicit_pad"')
  expect(svg).toContain('width="90" height="40"')
  expect(svg).toContain('width="25" height="12.5"')
})

test("showSolderPaste renders pad-margin fallback paste", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    width: 600,
    height: 600,
    showSolderPaste: true,
  })

  expect(svg.match(/class="pcb-solder-paste"/g)).toHaveLength(2)
  expect(svg).toContain('data-pcb-smtpad-id="fallback_pad"')
  expect(svg).not.toContain('data-pcb-smtpad-id="explicit_pad"')
})

test("polygon pad margin renders fallback paste as an offset polygon", () => {
  const svg = convertCircuitJsonToSolderPasteMask(
    [
      circuitJson[0],
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "polygon_pad",
        shape: "polygon",
        layer: "top",
        points: [
          { x: -1, y: -1 },
          { x: 1, y: -1 },
          { x: 1, y: 1 },
          { x: -1, y: 1 },
        ],
        solderpaste_margin: -0.2,
      },
    ] as any,
    { layer: "top", width: 600, height: 600 },
  )

  expect(svg).toContain('class="pcb-solder-paste"')
  expect(svg).toContain('data-pcb-smtpad-id="polygon_pad"')
  expect(svg).toContain('points="260,340 340,340 340,260 260,260"')
})
