import type {
  AnyCircuitElement,
  PcbFabricationNoteDimension,
} from "circuit-json"
import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb fabrication note dimension renders", () => {
  const board: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  }

  const fabricationDimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension" as const,
    pcb_fabrication_note_dimension_id: "fab_dimension_1",
    pcb_component_id: "pcb_component_id_1",
    from: { x: 0, y: 0 },
    to: { x: 12, y: 0 },
    text: "12.00 mm",
    font: "tscircuit2024" as const,
    font_size: 1.2,
    arrow_size: 0.8,
    layer: "top" as const,
    offset_distance: 0.8,
    offset_direction: { x: 0, y: 1 },
  }

  const angledFabricationDimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension" as const,
    pcb_fabrication_note_dimension_id: "fab_dimension_2",
    from: { x: 2, y: 2 },
    to: { x: 6, y: 6 },
    text: "5.66 mm",
    font: "tscircuit2024" as const,
    font_size: 1,
    arrow_size: 0.6,
    color: "rgba(0, 255, 255, 0.9)",
    layer: "top" as const,
    pcb_component_id: "pcb_component_1",
    offset_distance: 1.2,
    offset_direction: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  }

  const rotatedFabricationDimension90: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension" as const,
    pcb_fabrication_note_dimension_id: "fab_dimension_3",
    from: { x: 0, y: -8 },
    to: { x: 10, y: -8 },
    text: "10.00 mm",
    font: "tscircuit2024" as const,
    font_size: 1.2,
    arrow_size: 0.8,
    layer: "top" as const,
    pcb_component_id: "pcb_component_id_2",
    offset_distance: 0.8,
    offset_direction: { x: 0, y: 1 },
    text_ccw_rotation: 90,
  }

  const rotatedFabricationDimension45: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension" as const,
    pcb_fabrication_note_dimension_id: "fab_dimension_4",
    from: { x: -10, y: 0 },
    to: { x: -2, y: 0 },
    text: "8.00 mm",
    font: "tscircuit2024" as const,
    font_size: 1.0,
    arrow_size: 0.7,
    layer: "top" as const,
    pcb_component_id: "pcb_component_id_3",
    offset_distance: 0.8,
    offset_direction: { x: 0, y: 1 },
    text_ccw_rotation: 45,
  }

  const rotatedFabricationDimension30: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension" as const,
    pcb_fabrication_note_dimension_id: "fab_dimension_7",
    from: { x: -10, y: -8 },
    to: { x: -4, y: -8 },
    text: "6.00 mm",
    font: "tscircuit2024" as const,
    font_size: 0.9,
    arrow_size: 0.6,
    layer: "top" as const,
    pcb_component_id: "pcb_component_id_6",
    offset_distance: 0.8,
    offset_direction: { x: 0, y: 1 },
    text_ccw_rotation: 30,
  }

  const svg = convertCircuitJsonToPcbSvg([
    board,
    fabricationDimension as unknown as AnyCircuitElement,
    angledFabricationDimension as unknown as AnyCircuitElement,
    rotatedFabricationDimension90 as unknown as AnyCircuitElement,
    rotatedFabricationDimension45 as unknown as AnyCircuitElement,
    rotatedFabricationDimension30 as unknown as AnyCircuitElement,
  ])
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
