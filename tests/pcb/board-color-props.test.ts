import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    solder_mask_color: "blue",
    silkscreen_color: "yellow",
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "ss0",
    pcb_component_id: "comp0",
    x1: -1,
    y1: 0,
    x2: -1,
    y2: 3,
    stroke_width: 0.1,
    layer: "top",
  },
]

test("pcb_board colors are used as soldermask and silkscreen defaults", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  expect(svg).toContain('class="pcb-board-soldermask"')
  expect(svg).toContain('fill="blue"')
  expect(svg).toContain('class="pcb-silkscreen-line pcb-silkscreen-top"')
  expect(svg).toContain('stroke="yellow"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("pcb_board colors are ignored outside soldermask rendering", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit)

  expect(svg).not.toContain('stroke="yellow"')
  expect(svg).toContain('stroke="#f2eda1"')
})

test("color overrides take priority over pcb_board colors", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
    colorOverrides: {
      soldermask: { top: "#00ff00" },
      silkscreen: { top: "#ff00ff" },
    },
  })

  expect(svg).toContain('class="pcb-board-soldermask"')
  expect(svg).toContain('fill="#00ff00"')
  expect(svg).toContain('stroke="#ff00ff"')
})

test("bottom layer uses pcb_board soldermask color", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    layer: "bottom",
    showSolderMask: true,
  })

  expect(svg).toContain('class="pcb-board-soldermask"')
  expect(svg).toContain('fill="blue"')
  expect(svg).toContain('data-pcb-layer="soldermask-bottom"')
})

test("multiple boards do not inherit the first board color as a global default", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_board",
        pcb_board_id: "board0",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
        solder_mask_color: "blue",
        silkscreen_color: "yellow",
      },
      {
        type: "pcb_board",
        pcb_board_id: "board1",
        center: { x: 20, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
        solder_mask_color: "red",
        silkscreen_color: "white",
      },
    ],
    {
      showSolderMask: true,
    },
  )

  expect(svg).not.toContain('fill="blue"')
  expect(svg).not.toContain('fill="red"')
})
