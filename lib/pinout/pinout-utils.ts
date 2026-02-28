import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

export function getPortLabelInfo(
  port: PcbPort,
  soup: AnyCircuitElement[],
): { text: string; aliases: string[]; color?: string } | null {
  const source_port = su(soup).source_port.get(port.source_port_id)
  if (!source_port) return null

  const eligible_hints =
    source_port.port_hints?.filter(
      (h) =>
        !/^\d+$/.test(h) && !["left", "right", "top", "bottom"].includes(h),
    ) ?? []

  let label = eligible_hints[0]
  if (!label) label = source_port.name

  if (!label) return null

  const aliases = eligible_hints.filter((h) => h !== label)

  // Get color from source_port if available (pinout_color is a proposed extension)
  const color =
    "pinout_color" in source_port
      ? (source_port.pinout_color as string)
      : undefined

  return { text: label, aliases, color }
}

export function getClosestEdge(
  port_pos_real: { x: number; y: number },
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number },
): "left" | "right" | "top" | "bottom" {
  const dists = {
    left: port_pos_real.x - board_bounds.minX,
    right: board_bounds.maxX - port_pos_real.x,
    top: board_bounds.maxY - port_pos_real.y,
    bottom: port_pos_real.y - board_bounds.minY,
  }

  let closest_edge: "left" | "right" | "top" | "bottom" = "left"
  let min_dist = dists.left

  if (dists.right < min_dist) {
    min_dist = dists.right
    closest_edge = "right"
  }
  if (dists.top < min_dist) {
    min_dist = dists.top
    closest_edge = "top"
  }
  if (dists.bottom < min_dist) {
    min_dist = dists.bottom
    closest_edge = "bottom"
  }

  return closest_edge
}
