import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test('non-finite via hole_diameter and outer_diameter do not emit r="NaN"', () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    } as any,
    {
      type: "pcb_via",
      pcb_via_id: "via_nan_hole",
      x: 0,
      y: 0,
      outer_diameter: 0.6,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    } as any,
    {
      type: "pcb_via",
      pcb_via_id: "via_nan_outer",
      x: 5,
      y: 5,
      outer_diameter: Number.NaN,
      hole_diameter: 0.3,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    } as any,
    {
      type: "pcb_via",
      pcb_via_id: "via_inf",
      x: -5,
      y: -5,
      outer_diameter: Number.POSITIVE_INFINITY,
      hole_diameter: Number.NEGATIVE_INFINITY,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).not.toContain('r="NaN"')
  expect(svg).not.toContain('r="Infinity"')
  expect(svg).not.toContain('r="-Infinity"')
})

test('non-finite plated hole diameters do not emit r="NaN"', () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated_hole_circle_nan",
      shape: "circle",
      x: 0,
      y: 0,
      outer_diameter: Number.NaN,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated_hole_circle_rect_pad_nan",
      shape: "circular_hole_with_rect_pad",
      x: 5,
      y: 5,
      rect_pad_width: 1.5,
      rect_pad_height: 1.5,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated_hole_polygon_pad_nan",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      x: -5,
      y: -5,
      hole_diameter: Number.NaN,
      pad_outline: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
      layers: ["top", "bottom"],
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).not.toContain('r="NaN"')
  expect(svg).not.toContain('r="Infinity"')
  expect(svg).not.toContain('r="-Infinity"')
})
