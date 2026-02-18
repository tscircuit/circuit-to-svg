import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

type CircuitElement = any

// Helper to create circuit with carrier board and mounted boards
const createCarrierBoardCircuit = (): CircuitElement[] => [
  // Carrier board (larger, is_mounted_to_carrier_board indicates this board IS the carrier)
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_carrier",
    center: { x: 0, y: 0 },
    width: 80,
    height: 60,
    material: "fr4",
    num_layers: 4,
    thickness: 1.6,
    is_mounted_to_carrier_board: true,
  },
  // Main board mounted on carrier
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_main",
    carrier_pcb_board_id: "pcb_board_carrier",
    center: { x: -15, y: 0 },
    width: 30,
    height: 25,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  // Secondary board mounted on carrier
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_secondary",
    carrier_pcb_board_id: "pcb_board_carrier",
    center: { x: 20, y: 0 },
    width: 25,
    height: 20,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  // SMT pads on main board
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_main_1",
    layer: "top",
    shape: "rect",
    x: -22,
    y: 5,
    width: 2,
    height: 1.5,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_main_2",
    layer: "top",
    shape: "rect",
    x: -8,
    y: 5,
    width: 2,
    height: 1.5,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_main_3",
    layer: "top",
    shape: "rect",
    x: -22,
    y: -5,
    width: 2,
    height: 1.5,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_main_4",
    layer: "top",
    shape: "rect",
    x: -8,
    y: -5,
    width: 2,
    height: 1.5,
  },
  // SMT pads on secondary board
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_sec_1",
    layer: "top",
    shape: "rect",
    x: 12,
    y: 3,
    width: 2,
    height: 1.5,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_sec_2",
    layer: "top",
    shape: "rect",
    x: 28,
    y: 3,
    width: 2,
    height: 1.5,
  },
  // Traces on main board
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_main_1",
    route: [
      { route_type: "wire", x: -21, y: 5, width: 0.2, layer: "top" },
      { route_type: "wire", x: -15, y: 5, width: 0.2, layer: "top" },
      { route_type: "wire", x: -15, y: -5, width: 0.2, layer: "top" },
      { route_type: "wire", x: -9, y: -5, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_main_2",
    route: [
      { route_type: "wire", x: -9, y: 5, width: 0.2, layer: "top" },
      { route_type: "wire", x: -9, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: -21, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: -21, y: -5, width: 0.2, layer: "top" },
    ],
  },
  // Trace on secondary board
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_sec_1",
    route: [
      { route_type: "wire", x: 13, y: 3, width: 0.2, layer: "top" },
      { route_type: "wire", x: 20, y: 3, width: 0.2, layer: "top" },
      { route_type: "wire", x: 20, y: -3, width: 0.2, layer: "top" },
      { route_type: "wire", x: 27, y: -3, width: 0.2, layer: "top" },
      { route_type: "wire", x: 27, y: 3, width: 0.2, layer: "top" },
    ],
  },
  // Vias on main board
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_main_1",
    x: -15,
    y: 0,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  // Vias on secondary board
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_sec_1",
    x: 20,
    y: 0,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  // Plated holes on main board (mounting holes)
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_main_1",
    x: -27,
    y: 10,
    hole_diameter: 2.2,
    outer_diameter: 3.5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_main_2",
    x: -3,
    y: 10,
    hole_diameter: 2.2,
    outer_diameter: 3.5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_main_3",
    x: -27,
    y: -10,
    hole_diameter: 2.2,
    outer_diameter: 3.5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_main_4",
    x: -3,
    y: -10,
    hole_diameter: 2.2,
    outer_diameter: 3.5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  // Plated holes on carrier board corners
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_carrier_1",
    x: -35,
    y: 25,
    hole_diameter: 3,
    outer_diameter: 5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_carrier_2",
    x: 35,
    y: 25,
    hole_diameter: 3,
    outer_diameter: 5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_carrier_3",
    x: -35,
    y: -25,
    hole_diameter: 3,
    outer_diameter: 5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_hole_carrier_4",
    x: 35,
    y: -25,
    hole_diameter: 3,
    outer_diameter: 5,
    shape: "circle",
    layers: ["top", "bottom"],
  },
  // Silkscreen on main board
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_main",
    layer: "top",
    text: "MAIN",
    anchor_position: { x: -15, y: -8 },
    anchor_alignment: "center",
    font_size: 1.5,
  },
  // Silkscreen on secondary board
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_sec",
    layer: "top",
    text: "SEC",
    anchor_position: { x: 20, y: -6 },
    anchor_alignment: "center",
    font_size: 1.2,
  },
  // Silkscreen on carrier board
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_carrier",
    layer: "top",
    text: "CARRIER",
    anchor_position: { x: 0, y: 25 },
    anchor_alignment: "center",
    font_size: 2,
  },
]

test("carrier board without soldermask", () => {
  const circuit = createCarrierBoardCircuit()

  const result = convertCircuitJsonToPcbSvg(circuit)

  // Verify no soldermask
  expect(result).not.toContain("pcb-board-soldermask")
  // Verify all 3 boards are rendered
  expect(result.match(/class="pcb-board"/g)?.length).toBe(3)
  expect(result).toMatchSvgSnapshot(`${import.meta.path}.no-soldermask`)
})

test("carrier board with soldermask", () => {
  const circuit = createCarrierBoardCircuit()

  const result = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  // Verify soldermask is rendered on all 3 boards
  expect(result).toContain("pcb-board-soldermask")
  expect(result.match(/class="pcb-board-soldermask"/g)?.length).toBe(3)
  expect(result).toMatchSvgSnapshot(`${import.meta.path}.with-soldermask`)
})
