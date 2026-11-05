import { describe, expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "../../lib"

describe("polygon SMT pad overlap error, rats-nest, and rotated outside-board error", () => {
  test("draws pcb_footprint_overlap_error for polygon SMT pads without NaN coordinates", () => {
    const svg = convertCircuitJsonToPcbSvg(
      [
        {
          type: "pcb_board",
          pcb_board_id: "board_1",
          center: { x: 0, y: 0 },
          width: 20,
          height: 20,
          thickness: 1.6,
          num_layers: 2,
          material: "fr4",
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "poly_pad_1",
          layer: "top",
          shape: "polygon",
          points: [
            { x: -2, y: -1 },
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -2, y: 1 },
          ],
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "poly_pad_2",
          layer: "top",
          shape: "polygon",
          points: [
            { x: -0.5, y: -1 },
            { x: 1.5, y: -1 },
            { x: 1.5, y: 1 },
            { x: -0.5, y: 1 },
          ],
        },
        {
          type: "pcb_footprint_overlap_error",
          pcb_error_id: "overlap_err_1",
          error_type: "pcb_footprint_overlap_error",
          message: "Polygon pads overlap",
          pcb_smtpad_ids: ["poly_pad_1", "poly_pad_2"],
        },
      ] as any,
      {
        shouldDrawErrors: true,
      },
    )

    expect(svg).toContain('data-type="pcb_footprint_overlap_error"')
    expect(svg).toContain("Polygon pads overlap")
    expect(svg).not.toContain("NaN")
  })

  test("draws pcb_rats_nest lines connected to polygon SMT pads", () => {
    const svg = convertCircuitJsonToPcbSvg(
      [
        {
          type: "pcb_board",
          pcb_board_id: "board_1",
          center: { x: 0, y: 0 },
          width: 20,
          height: 20,
          thickness: 1.6,
          num_layers: 2,
          material: "fr4",
        },
        {
          type: "source_trace",
          source_trace_id: "st_1",
          connected_source_port_ids: ["sp_1", "sp_2"],
          connected_source_net_ids: [],
        },
        {
          type: "pcb_port",
          pcb_port_id: "pp_1",
          source_port_id: "sp_1",
          x: -3,
          y: 0,
          layers: ["top"],
        },
        {
          type: "pcb_port",
          pcb_port_id: "pp_2",
          source_port_id: "sp_2",
          x: 3,
          y: 0,
          layers: ["top"],
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "poly_pad_left",
          pcb_port_id: "pp_1",
          layer: "top",
          shape: "polygon",
          points: [
            { x: -4, y: -1 },
            { x: -2, y: -1 },
            { x: -2, y: 1 },
            { x: -4, y: 1 },
          ],
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "poly_pad_right",
          pcb_port_id: "pp_2",
          layer: "top",
          shape: "polygon",
          points: [
            { x: 2, y: -1 },
            { x: 4, y: -1 },
            { x: 4, y: 1 },
            { x: 2, y: 1 },
          ],
        },
      ] as any,
      {
        shouldDrawRatsNest: true,
      },
    )

    expect(svg).toContain('data-type="pcb_rats_nest"')
    expect(svg).not.toContain("NaN")
  })

  test("rotates component bounds in pcb_component_outside_board_error when component is rotated", () => {
    const baseCircuit = [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        center: { x: 0, y: 0 },
        width: 20,
        height: 20,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "pcb_component_outside_board_error",
        pcb_error_id: "outside_err_1",
        error_type: "pcb_component_outside_board_error",
        message: "Component outside board",
        pcb_component_id: "comp_1",
        pcb_board_id: "board_1",
      },
    ]

    const unrotatedSvg = convertCircuitJsonToPcbSvg(
      [
        ...baseCircuit,
        {
          type: "pcb_component",
          pcb_component_id: "comp_1",
          center: { x: 8, y: 0 },
          width: 6,
          height: 2,
          rotation: 0,
          layer: "top",
          obstructs_within_bounds: true,
        },
      ] as any,
      { shouldDrawErrors: true },
    )

    const rotatedSvg = convertCircuitJsonToPcbSvg(
      [
        ...baseCircuit,
        {
          type: "pcb_component",
          pcb_component_id: "comp_1",
          center: { x: 8, y: 0 },
          width: 6,
          height: 2,
          rotation: 90,
          layer: "top",
          obstructs_within_bounds: true,
        },
      ] as any,
      { shouldDrawErrors: true },
    )

    const getOutlineRect = (svg: string) => {
      const match = svg.match(
        /<rect[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*fill="none"[^>]*data-type="pcb_component_outside_board_error"/,
      )
      return match
        ? { width: Number(match[1]), height: Number(match[2]) }
        : null
    }

    const unrotatedRect = getOutlineRect(unrotatedSvg)
    const rotatedRect = getOutlineRect(rotatedSvg)
    expect(unrotatedRect).not.toBeNull()
    expect(rotatedRect).not.toBeNull()
    expect(unrotatedRect!.width).toBeGreaterThan(unrotatedRect!.height)
    expect(rotatedRect!.height).toBeGreaterThan(rotatedRect!.width)
    expect(rotatedRect!.width).toBeCloseTo(unrotatedRect!.height, 5)
    expect(rotatedRect!.height).toBeCloseTo(unrotatedRect!.width, 5)
  })
})
