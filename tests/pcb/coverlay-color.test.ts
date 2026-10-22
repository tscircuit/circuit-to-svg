import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { createCoverlayCircuit } from "../fixtures/coverlay-circuit"
import type { CircuitJson } from "circuit-json"

test("yellow flex coverlay preserves pad and substrate openings", () => {
  const svg = convertCircuitJsonToPcbSvg(createCoverlayCircuit("yellow"), {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "yellow")
})

test("black flex coverlay preserves pad and substrate openings", () => {
  const svg = convertCircuitJsonToPcbSvg(createCoverlayCircuit("black"), {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "black")
})

test("white flex coverlay preserves pad and substrate openings", () => {
  const svg = convertCircuitJsonToPcbSvg(createCoverlayCircuit("white"), {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "white")
})

test("bottom flex face uses white coverlay", () => {
  const svg = convertCircuitJsonToPcbSvg(createCoverlayCircuit("white"), {
    showSolderMask: true,
    layer: "bottom",
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "white-bottom")
})

test("rigid boards ignore coverlay color", () => {
  const circuit = createCoverlayCircuit("black")
  const board = circuit.find((e) => e.type === "pcb_board")!
  board.material = "fr4"
  const black = convertCircuitJsonToPcbSvg(circuit, { showSolderMask: true })
  board.coverlay_color = "white"
  expect(convertCircuitJsonToPcbSvg(circuit, { showSolderMask: true })).toBe(
    black,
  )
})

test("explicit render colors override flex coverlay", () => {
  const svg = convertCircuitJsonToPcbSvg(createCoverlayCircuit("black"), {
    showSolderMask: true,
    colorOverrides: { soldermask: { top: "#ff00ff" } },
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "explicit-override")
})

test("neighboring flex boards retain independent coverlay colors", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "black_board",
      subcircuit_id: "black",
      material: "flex",
      coverlay_color: "black",
      center: { x: -7, y: 0 },
      width: 12,
      height: 8,
      thickness: 0.1,
      num_layers: 2,
    },
    {
      type: "pcb_board",
      pcb_board_id: "white_board",
      subcircuit_id: "white",
      material: "flex",
      coverlay_color: "white",
      center: { x: 7, y: 0 },
      width: 12,
      height: 8,
      thickness: 0.1,
      num_layers: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "black_pad",
      subcircuit_id: "black",
      shape: "rect",
      layer: "top",
      x: -7,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "white_pad",
      subcircuit_id: "white",
      shape: "rect",
      layer: "top",
      x: 7,
      y: 0,
      width: 2,
      height: 2,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, { showSolderMask: true })
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "coverlay-neighboring-boards",
  )
})
