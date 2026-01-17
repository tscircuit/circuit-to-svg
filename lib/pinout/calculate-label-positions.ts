import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PinoutLabel } from "./convert-circuit-json-to-pinout-svg"
import {
  STAGGER_OFFSET_MIN,
  STAGGER_OFFSET_PER_PIN,
  STAGGER_OFFSET_STEP,
  ALIGNED_OFFSET_MARGIN,
  GROUP_SEPARATION_MM,
  LABEL_RECT_HEIGHT_BASE_MM,
} from "./constants"

export type LabelPosition = {
  text: string
  aliases: string[]
  elbow_end: { x: number; y: number }
  label_pos: { x: number; y: number }
  edge: "left" | "right" | "top" | "bottom"
  highlightColor?: string
}

function calculateVerticalEdgeLabels(
  edge: "left" | "right",
  pinout_labels: PinoutLabel[],
  {
    transform,
    soup,
    board_bounds,
    svgHeight,
    styleScale,
  }: {
    transform: Matrix
    soup: AnyCircuitElement[]
    board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
    svgHeight: number
    styleScale: number
  },
  label_positions: Map<string, LabelPosition>,
) {
  const x_coords = pinout_labels.map((l) => l.pcb_port.x)
  const counts: { [k: string]: number } = {}
  for (const x of x_coords) {
    const rounded = x.toFixed(1)
    counts[rounded] = (counts[rounded] || 0) + 1
  }

  let edge_ports

  if (Object.keys(counts).length > 1 && pinout_labels.length > 2) {
    // More than one group of x-coords, group and sort
    const sorted_x_groups = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const primary_x = parseFloat(sorted_x_groups[0]![0])

    const primary_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) < 0.2,
    )
    const other_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) >= 0.2,
    )

    const mapToEdgePort = (pinout_label: PinoutLabel) => ({
      pcb_port: pinout_label.pcb_port,
      y: applyToPoint(transform, [
        pinout_label.pcb_port.x,
        pinout_label.pcb_port.y,
      ])[1],
      aliases: pinout_label.aliases,
      highlightColor: pinout_label.highlightColor,
    })

    // Sort by y-descending in real-world coordinates
    primary_pins.sort((a, b) => b.pcb_port.y - a.pcb_port.y)
    other_pins.sort((a, b) => b.pcb_port.y - a.pcb_port.y)

    // Check if other pins should be at top or bottom
    const max_y_primary =
      primary_pins.length > 0
        ? Math.max(...primary_pins.map((p) => p.pcb_port.y))
        : -Infinity
    const max_y_other =
      other_pins.length > 0
        ? Math.max(...other_pins.map((p) => p.pcb_port.y))
        : -Infinity

    // A larger y-coordinate in real-world coordinates means the pin should
    // appear higher in the pinout diagram. We place the group with the
    // highest pin first.
    const combined_pins =
      max_y_other > max_y_primary
        ? [...other_pins, ...primary_pins]
        : [...primary_pins, ...other_pins]

    edge_ports = combined_pins.map(mapToEdgePort)
  } else {
    edge_ports = pinout_labels
      .map((pinout_label) => ({
        pcb_port: pinout_label.pcb_port,
        y: applyToPoint(transform, [
          pinout_label.pcb_port.x,
          pinout_label.pcb_port.y,
        ])[1],
        aliases: pinout_label.aliases,
        highlightColor: pinout_label.highlightColor,
      }))
      .sort((a, b) => a.y - b.y)
  }

  if (edge_ports.length === 0) return

  const board_edge_x = applyToPoint(transform, [
    edge === "left" ? board_bounds.minX : board_bounds.maxX,
    0,
  ])[0]

  const num_labels = edge_ports.length

  const x_coords_counts: { [k: string]: number } = {}
  for (const pl of pinout_labels) {
    const rounded = pl.pcb_port.x.toFixed(1)
    x_coords_counts[rounded] = (x_coords_counts[rounded] || 0) + 1
  }

  let main_group_pin_port_ids = new Set<string>()
  if (Object.keys(x_coords_counts).length > 1 && pinout_labels.length > 2) {
    const sorted_x_groups = Object.entries(x_coords_counts).sort(
      (a, b) => b[1] - a[1],
    )
    const primary_x = parseFloat(sorted_x_groups[0]![0])

    const primary_pins = pinout_labels.filter(
      (l) => Math.abs(l.pcb_port.x - primary_x) < 0.2,
    )
    main_group_pin_port_ids = new Set(
      primary_pins.map((p) => p.pcb_port.pcb_port_id),
    )
  }

  const main_group_indices = edge_ports
    .map((ep, i) => {
      if (main_group_pin_port_ids.has(ep.pcb_port.pcb_port_id)) {
        return i
      }
      return -1 // or some other flag
    })
    .filter((i) => i !== -1)

  const geometric_middle_index = (num_labels - 1) / 2

  const pxPerMm = Math.abs(transform.a)
  const label_rect_height = LABEL_RECT_HEIGHT_BASE_MM * styleScale * pxPerMm
  const BASE_GAP_MM = 0.3
  const label_margin = Math.max(
    0.2 * pxPerMm,
    BASE_GAP_MM * styleScale * pxPerMm,
  )
  const group_gap_px = GROUP_SEPARATION_MM * styleScale * pxPerMm

  const stagger_offset_base =
    (STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN) *
    styleScale *
    pxPerMm

  const max_stagger_offset =
    stagger_offset_base +
    geometric_middle_index * (STAGGER_OFFSET_STEP * styleScale * pxPerMm)
  const aligned_label_offset =
    max_stagger_offset + ALIGNED_OFFSET_MARGIN * styleScale * pxPerMm

  const num_other_pins = num_labels - main_group_indices.length
  // If there's no main group, all pins are "other" pins
  const num_pins_to_stack =
    main_group_indices.length === 0 ? num_labels : num_other_pins

  const stack_total_height =
    num_pins_to_stack * label_rect_height +
    Math.max(0, num_pins_to_stack - 1) * label_margin

  let current_y: number
  if (main_group_indices.length > 0 && num_other_pins > 0) {
    const main_group_y_coords = main_group_indices.map((i) => edge_ports[i]!.y)
    const min_main_group_y = Math.min(...main_group_y_coords)
    const max_main_group_y = Math.max(...main_group_y_coords)
    const main_group_top_extent = min_main_group_y - label_rect_height / 2
    const main_group_bottom_extent = max_main_group_y + label_rect_height / 2

    const other_pin_indices = edge_ports
      .map((_, index) => index)
      .filter((index) => !main_group_indices.includes(index))

    // Assumes edge_ports is sorted top-to-bottom on screen
    const others_are_above = other_pin_indices[0]! < main_group_indices[0]!

    if (others_are_above) {
      // Place stack above main group
      const stack_bottom_edge =
        main_group_top_extent - (label_margin * 2 + group_gap_px)
      current_y = stack_bottom_edge - stack_total_height + label_rect_height / 2
    } else {
      // Place stack below main group
      const stack_top_edge =
        main_group_bottom_extent + (label_margin * 2 + group_gap_px)
      current_y = stack_top_edge + label_rect_height / 2
    }
  } else {
    // Original behavior for centering one big stack
    current_y = (svgHeight - stack_total_height) / 2 + label_rect_height / 2
  }

  const is_all_main_group = main_group_indices.length === num_labels

  edge_ports.forEach(({ pcb_port, aliases, highlightColor }, i) => {
    let stagger_rank: number
    if (main_group_indices.length > 0) {
      if (main_group_indices.includes(i)) {
        stagger_rank = geometric_middle_index // max stagger for main group
      } else {
        const min_lg_idx = Math.min(...main_group_indices)
        const max_lg_idx = Math.max(...main_group_indices)
        let dist_from_main_group: number
        if (i < min_lg_idx) {
          dist_from_main_group = min_lg_idx - i
        } else {
          // i > max_lg_idx
          dist_from_main_group = i - max_lg_idx
        }
        stagger_rank = geometric_middle_index - dist_from_main_group
      }
    } else {
      // Standard V-shape for all pins
      const dist_from_middle = Math.abs(i - geometric_middle_index)
      stagger_rank = geometric_middle_index - dist_from_middle
    }
    const stagger_offset =
      stagger_offset_base +
      stagger_rank * (STAGGER_OFFSET_STEP * styleScale * pxPerMm)
    const sign = edge === "left" ? -1 : 1

    const is_main_group_pin = main_group_indices.includes(i)

    const y_pos = is_all_main_group
      ? edge_ports[i]!.y
      : main_group_indices.length > 0 && is_main_group_pin
        ? edge_ports[i]!.y
        : current_y

    const elbow_end = {
      x: board_edge_x + sign * stagger_offset,
      y: y_pos,
    }
    const label_pos = {
      x: board_edge_x + sign * aligned_label_offset,
      y: y_pos,
    }

    label_positions.set(pcb_port.pcb_port_id, {
      text: aliases[0]!,
      aliases: aliases.slice(1),
      elbow_end,
      label_pos,
      edge,
      highlightColor,
    })

    if (!(main_group_indices.length > 0 && is_main_group_pin)) {
      current_y += label_rect_height + label_margin
    }
  })
}

export const calculateLabelPositions = ({
  left_labels,
  right_labels,
  transform,
  soup,
  board_bounds,
  svgWidth,
  svgHeight,
  styleScale,
}: {
  left_labels: PinoutLabel[]
  right_labels: PinoutLabel[]
  transform: Matrix
  soup: AnyCircuitElement[]
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
  svgWidth: number
  svgHeight: number
  styleScale: number
}): Map<string, LabelPosition> => {
  const label_positions = new Map<string, LabelPosition>()

  const shared_params = { transform, soup, board_bounds }

  calculateVerticalEdgeLabels(
    "left",
    left_labels,
    {
      ...shared_params,
      svgHeight,
      styleScale,
    },
    label_positions,
  )

  calculateVerticalEdgeLabels(
    "right",
    right_labels,
    {
      ...shared_params,
      svgHeight,
      styleScale,
    },
    label_positions,
  )

  return label_positions
}
