import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

export function getPortLabelInfo(
  port: PcbPort,
  soup: AnyCircuitElement[],
): { text: string; aliases: string[] } | null {
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

  // Split underscore-delimited labels into separate tokens for multi-label display
  // e.g. "GP0_SPI0RX_I2C0SDA_UART0TX" → ["GP0", "SPI0RX", "I2C0SDA", "UART0TX"]
  const splitToken = (t: string) => (t.includes("_") ? t.split("_") : [t])
  const allTokens = [...splitToken(label), ...aliases.flatMap(splitToken)]

  return { text: allTokens[0]!, aliases: allTokens.slice(1) }
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
