import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic table", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table1",
      anchor_position: { x: 0, y: 0 },
      anchor: "center",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell1",
      schematic_table_id: "table1",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "R1",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell2",
      schematic_table_id: "table1",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "10k",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell3",
      schematic_table_id: "table1",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 1,
      text: "Merged Cell",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-default`)
})

test("schematic table with different font sizes", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_font_sizes",
      anchor_position: { x: 5, y: 5 },
      anchor: "center",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_fs1",
      schematic_table_id: "table_font_sizes",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "Small",
      font_size: 0.1,
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_fs2",
      schematic_table_id: "table_font_sizes",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "Normal",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_fs3",
      schematic_table_id: "table_font_sizes",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 0,
      text: "Large",
      font_size: 0.3,
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_fs4",
      schematic_table_id: "table_font_sizes",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 1,
      end_column_index: 1,
      text: "X-Large",
      font_size: 0.4,
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-font-sizes`)
})

test("schematic table with different alignments", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_alignments",
      anchor_position: { x: 10, y: 0 },
      anchor: "center",
    } as any,
    // Row 1
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tl",
      schematic_table_id: "table_alignments",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "T-L",
      horizontal_align: "left",
      vertical_align: "top",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tc",
      schematic_table_id: "table_alignments",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "T-C",
      horizontal_align: "center",
      vertical_align: "top",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tr",
      schematic_table_id: "table_alignments",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 2,
      end_column_index: 2,
      text: "T-R",
      horizontal_align: "right",
      vertical_align: "top",
    } as any,
    // Row 2
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_ml",
      schematic_table_id: "table_alignments",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 0,
      text: "M-L",
      horizontal_align: "left",
      vertical_align: "middle",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_mc",
      schematic_table_id: "table_alignments",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 1,
      end_column_index: 1,
      text: "M-C",
      horizontal_align: "center",
      vertical_align: "middle",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_mr",
      schematic_table_id: "table_alignments",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 2,
      end_column_index: 2,
      text: "M-R",
      horizontal_align: "right",
      vertical_align: "middle",
    } as any,
    // Row 3
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_bl",
      schematic_table_id: "table_alignments",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 0,
      end_column_index: 0,
      text: "B-L",
      horizontal_align: "left",
      vertical_align: "bottom",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_bc",
      schematic_table_id: "table_alignments",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 1,
      end_column_index: 1,
      text: "B-C",
      horizontal_align: "center",
      vertical_align: "bottom",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_br",
      schematic_table_id: "table_alignments",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 2,
      end_column_index: 2,
      text: "B-R",
      horizontal_align: "right",
      vertical_align: "bottom",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-alignments`)
})

test("schematic table with custom border width", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_border",
      anchor_position: { x: 0, y: -5 },
      anchor: "center",
      border_width: 0.1,
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_b1",
      schematic_table_id: "table_border",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "Thick",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_b2",
      schematic_table_id: "table_border",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "Border",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-custom-border-width`)
})

test("schematic table with empty cells", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_empty",
      anchor_position: { x: -5, y: 0 },
      anchor: "center",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_e1",
      schematic_table_id: "table_empty",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "A1",
    } as any,
    // Empty cell at (0, 1)
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_e2",
      schematic_table_id: "table_empty",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
    } as any,
    // Empty cell at (1, 0)
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_e3",
      schematic_table_id: "table_empty",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 0,
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_e4",
      schematic_table_id: "table_empty",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 1,
      end_column_index: 1,
      text: "B2",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-empty-cells`)
})

test("complex schematic table", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_complex",
      anchor_position: { x: 5, y: -5 },
      anchor: "top_left",
    } as any,
    // Header row
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_h1",
      schematic_table_id: "table_complex",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "Pin",
      font_size: 0.2,
      horizontal_align: "center",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_h2",
      schematic_table_id: "table_complex",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "Function",
      font_size: 0.2,
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_h3",
      schematic_table_id: "table_complex",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 2,
      end_column_index: 2,
      text: "Notes",
      font_size: 0.2,
    } as any,
    // Data rows
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_r1c1",
      schematic_table_id: "table_complex",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 0,
      text: "1",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_r1c2",
      schematic_table_id: "table_complex",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 1,
      end_column_index: 1,
      text: "VCC",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_r1c3",
      schematic_table_id: "table_complex",
      start_row_index: 1,
      end_row_index: 2,
      start_column_index: 2,
      end_column_index: 2,
      text: "5V tolerant",
      vertical_align: "middle",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_r2c1",
      schematic_table_id: "table_complex",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 0,
      end_column_index: 0,
      text: "2",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_c_r2c2",
      schematic_table_id: "table_complex",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 1,
      end_column_index: 1,
      text: "GND",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-complex`)
})

test("schematic table with top_left anchor", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table1",
      anchor_position: { x: 0, y: 0 },
      anchor: "top_left",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell1",
      schematic_table_id: "table1",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "R1",
    } as any,
  ]
  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-top-left-anchor`)
})

test("schematic table with specified dimensions", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_specified_dims",
      anchor_position: { x: 0, y: 0 },
      column_widths: [4, 1],
      row_heights: [2],
      anchor: "center",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_sd1",
      schematic_table_id: "table_specified_dims",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "Wide",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_sd2",
      schematic_table_id: "table_specified_dims",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "Narrow",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-specified-dims`)
})

test("schematic table with different alignments and specified dimensions", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_table",
      schematic_table_id: "table_alignments_specified",
      anchor_position: { x: 10, y: 0 },
      column_widths: [3, 3, 3],
      row_heights: [2, 2, 2],
      anchor: "center",
    } as any,
    // Row 1
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tl",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: "T-L",
      horizontal_align: "left",
      vertical_align: "top",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tc",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 1,
      end_column_index: 1,
      text: "T-C",
      horizontal_align: "center",
      vertical_align: "top",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_tr",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 2,
      end_column_index: 2,
      text: "T-R",
      horizontal_align: "right",
      vertical_align: "top",
    } as any,
    // Row 2
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_ml",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 0,
      end_column_index: 0,
      text: "M-L",
      horizontal_align: "left",
      vertical_align: "middle",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_mc",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 1,
      end_column_index: 1,
      text: "M-C",
      horizontal_align: "center",
      vertical_align: "middle",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_mr",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 1,
      end_row_index: 1,
      start_column_index: 2,
      end_column_index: 2,
      text: "M-R",
      horizontal_align: "right",
      vertical_align: "middle",
    } as any,
    // Row 3
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_bl",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 0,
      end_column_index: 0,
      text: "B-L",
      horizontal_align: "left",
      vertical_align: "bottom",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_bc",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 1,
      end_column_index: 1,
      text: "B-C",
      horizontal_align: "center",
      vertical_align: "bottom",
    } as any,
    {
      type: "schematic_table_cell",
      schematic_table_cell_id: "cell_br",
      schematic_table_id: "table_alignments_specified",
      start_row_index: 2,
      end_row_index: 2,
      start_column_index: 2,
      end_column_index: 2,
      text: "B-R",
      horizontal_align: "right",
      vertical_align: "bottom",
    } as any,
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-alignments-specified-dims`)
})
