import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PinoutLabel } from "./convert-circuit-json-to-pinout-svg"

export type LabelPosition = {
  text: string
  aliases: string[]
  elbow_end: { x: number; y: number }
  label_pos: { x: number; y: number }
  edge: "left" | "right" | "top" | "bottom"
}

const STAGGER_OFFSET_MIN = 20
const STAGGER_OFFSET_PER_PIN = 4
const STAGGER_OFFSET_STEP = 15
const ALIGNED_OFFSET_MARGIN = 10 // Margin beyond the last staggered point

const FONT_SIZE = 11
const BG_PADDING = 5
const LABEL_RECT_HEIGHT = FONT_SIZE + 2 * BG_PADDING
const LABEL_MARGIN = 5

function calculateVerticalEdgeLabels(
  edge: "left" | "right",
  pinout_labels: PinoutLabel[],
  {
    transform,
    soup,
    board_bounds,
    svgHeight,
  }: {
    transform: Matrix
    soup: AnyCircuitElement[]
    board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
    svgHeight: number
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
      }))
      .sort((a, b) => a.y - b.y)
  }

  if (edge_ports.length === 0) return

  const board_edge_x = applyToPoint(transform, [
    edge === "left" ? board_bounds.minX : board_bounds.maxX,
    0,
  ])[0]

  const num_labels = edge_ports.length
  const middle_index = (num_labels - 1) / 2

  const stagger_offset_base =
    STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

  const max_stagger_offset =
    stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
  const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

  const total_labels_height =
    num_labels * LABEL_RECT_HEIGHT + Math.max(0, num_labels - 1) * LABEL_MARGIN
  let current_y = (svgHeight - total_labels_height) / 2 + LABEL_RECT_HEIGHT / 2

  edge_ports.forEach(({ pcb_port, aliases }, i) => {
    const dist_from_middle = Math.abs(i - middle_index)
    const stagger_rank = middle_index - dist_from_middle
    const stagger_offset =
      stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP
    const sign = edge === "left" ? -1 : 1

    const elbow_end = {
      x: board_edge_x + sign * stagger_offset,
      y: current_y,
    }
    const label_pos = {
      x: board_edge_x + sign * aligned_label_offset,
      y: current_y,
    }

    label_positions.set(pcb_port.pcb_port_id, {
      text: aliases[0]!,
      aliases: aliases.slice(1),
      elbow_end,
      label_pos,
      edge,
    })
    current_y += LABEL_RECT_HEIGHT + LABEL_MARGIN
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
}: {
  left_labels: PinoutLabel[]
  right_labels: PinoutLabel[]
  transform: Matrix
  soup: AnyCircuitElement[]
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
  svgWidth: number
  svgHeight: number
}): Map<string, LabelPosition> => {
  const label_positions = new Map<string, LabelPosition>()

  const shared_params = { transform, soup, board_bounds }

  calculateVerticalEdgeLabels(
    "left",
    left_labels,
    {
      ...shared_params,
      svgHeight,
    },
    label_positions,
  )

  calculateVerticalEdgeLabels(
    "right",
    right_labels,
    {
      ...shared_params,
      svgHeight,
    },
    label_positions,
  )

  return label_positions
}
