import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb keepout rect and circle", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_rect_0",
      center: { x: -10, y: 10 },
      width: 8,
      height: 5,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_circle_0",
      center: { x: 0, y: 0 },
      radius: 4,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_rect_1",
      center: { x: 10, y: -10 },
      width: 6,
      height: 6,
      layers: ["bottom"],
      description: "No components allowed",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + "rect-and-circle")
})

test("pcb keepout multiple layers", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 4,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_multi_layer",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      layers: ["top", "bottom", "inner1"],
    },
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_circle_multi",
      center: { x: 15, y: 15 },
      radius: 5,
      layers: ["top", "bottom"],
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + "multiple-layers")
})

test("pcb keepout with layer filter", () => {
  const result = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_board",
        pcb_board_id: "pcb_board_0",
        center: { x: 0, y: 0 },
        width: 50,
        height: 40,
        material: "fr1",
        num_layers: 2,
        thickness: 1.2,
      },
      {
        type: "pcb_keepout",
        shape: "rect",
        pcb_keepout_id: "pcb_keepout_top",
        center: { x: -10, y: 0 },
        width: 8,
        height: 8,
        layers: ["top"],
      },
      {
        type: "pcb_keepout",
        shape: "circle",
        pcb_keepout_id: "pcb_keepout_bottom",
        center: { x: 10, y: 0 },
        radius: 4,
        layers: ["bottom"],
      },
    ],
    { layer: "top" },
  )

  expect(result).toMatchSvgSnapshot(import.meta.path + "layer-filter")
})

test("pcb keepout with pcb_group_id and subcircuit_id", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "rect",
      pcb_keepout_id: "pcb_keepout_grouped",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      layers: ["top"],
      pcb_group_id: "group_1",
      subcircuit_id: "subcircuit_1",
      description: "Keepout for group",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + "with-group-id")
})
