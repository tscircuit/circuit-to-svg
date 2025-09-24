import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { getPortLabelInfo } from "./pinout-utils"

export type LabelPosition = {
  text: string
  aliases: string[]
  elbow_end: { x: number; y: number }
  label_pos: { x: number; y: number }
  edge: "left" | "right" | "top" | "bottom"
}

const STAGGER_OFFSET_MIN = 20
const STAGGER_OFFSET_PER_PIN = 2
const STAGGER_OFFSET_STEP = 15
const ALIGNED_OFFSET_MARGIN = 10 // Margin beyond the last staggered point

const FONT_SIZE = 11
const BG_PADDING = 5
const LABEL_RECT_HEIGHT = FONT_SIZE + 2 * BG_PADDING
const LABEL_MARGIN = 5

function calculateVerticalEdgeLabels(
  edge: "left" | "right",
  ports: PcbPort[],
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
  const edge_ports = ports
    .map((port) => ({
      port,
      y: applyToPoint(transform, [port.x, port.y])[1],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.y - b.y)

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

  edge_ports.forEach(({ port, label_info }, i) => {
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

    label_positions.set(port.pcb_port_id, {
      text: label_info!.text,
      aliases: label_info!.aliases,
      elbow_end,
      label_pos,
      edge,
    })
    current_y += LABEL_RECT_HEIGHT + LABEL_MARGIN
  })
}

function calculateHorizontalEdgeLabels(
  edge: "top" | "bottom",
  ports: PcbPort[],
  {
    transform,
    soup,
    board_bounds,
    svgWidth,
  }: {
    transform: Matrix
    soup: AnyCircuitElement[]
    board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
    svgWidth: number
  },
  label_positions: Map<string, LabelPosition>,
) {
  const edge_ports = ports
    .map((port) => ({
      port,
      x: applyToPoint(transform, [port.x, port.y])[0],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.x - b.x)

  if (edge_ports.length === 0) return

  const board_edge_y = applyToPoint(transform, [
    0,
    edge === "top" ? board_bounds.maxY : board_bounds.minY,
  ])[1]

  const labels_with_widths = edge_ports.map((p) => {
    const label = [p.label_info!.text, ...p.label_info!.aliases].join(" | ")
    const textWidth = label.length * FONT_SIZE * 0.6
    const rectWidth = textWidth + 2 * BG_PADDING
    return { ...p, rectWidth }
  })

  const num_labels = labels_with_widths.length
  const middle_index = (num_labels - 1) / 2

  const stagger_offset_base =
    STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

  const max_stagger_offset =
    stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
  const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

  const total_labels_width =
    labels_with_widths.reduce((sum, l) => sum + l.rectWidth, 0) +
    Math.max(0, num_labels - 1) * LABEL_MARGIN
  let current_x = (svgWidth - total_labels_width) / 2

  labels_with_widths.forEach(({ port, label_info, rectWidth }, i) => {
    const dist_from_middle = Math.abs(i - middle_index)
    const stagger_rank = middle_index - dist_from_middle
    const stagger_offset =
      stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP

    const sign = edge === "top" ? -1 : 1

    const label_center_x = current_x + rectWidth / 2
    const elbow_end = {
      x: label_center_x,
      y: board_edge_y + sign * stagger_offset,
    }
    const label_pos = {
      x: label_center_x,
      y: board_edge_y + sign * aligned_label_offset,
    }

    label_positions.set(port.pcb_port_id, {
      text: label_info!.text,
      aliases: label_info!.aliases,
      elbow_end,
      label_pos,
      edge,
    })
    current_x += rectWidth + LABEL_MARGIN
  })
}

export const calculateLabelPositions = ({
  ports_by_edge,
  transform,
  soup,
  board_bounds,
  svgWidth,
  svgHeight,
}: {
  ports_by_edge: Record<"left" | "right" | "top" | "bottom", PcbPort[]>
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
    ports_by_edge.left,
    {
      ...shared_params,
      svgHeight,
    },
    label_positions,
  )

  calculateVerticalEdgeLabels(
    "right",
    ports_by_edge.right,
    {
      ...shared_params,
      svgHeight,
    },
    label_positions,
  )

  calculateHorizontalEdgeLabels(
    "top",
    ports_by_edge.top,
    {
      ...shared_params,
      svgWidth,
    },
    label_positions,
  )

  calculateHorizontalEdgeLabels(
    "bottom",
    ports_by_edge.bottom,
    {
      ...shared_params,
      svgWidth,
    },
    label_positions,
  )

  return label_positions
}
