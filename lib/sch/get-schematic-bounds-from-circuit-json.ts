import type { AnyCircuitElement } from "circuit-json"

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function getSchematicBoundsFromCircuitJson(
  soup: AnyCircuitElement[],
  padding = 0.5,
): Bounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const portSize = 0.2

  // Find the bounds
  for (const item of soup) {
    if (item.type === "schematic_component") {
      updateBounds(item.center, item.size, item.rotation || 0)
    } else if (item.type === "schematic_port") {
      updateBounds(item.center, { width: portSize, height: portSize }, 0)
    } else if (item.type === "schematic_debug_object") {
      if (item.shape === "rect") {
        updateBounds(item.center, item.size, 0)
      } else if (item.shape === "line") {
        updateBounds(item.start, { width: 0.1, height: 0.1 }, 0)
        updateBounds(item.end, { width: 0.1, height: 0.1 }, 0)
      }
    } else if (item.type === "schematic_net_label") {
      updateBounds(item.center, { width: 1, height: 1 }, 0)
    } else if (item.type === "schematic_trace") {
      for (const edge of item.edges) {
        updateBounds(edge.from, { width: 0.1, height: 0.1 }, 0)
        updateBounds(edge.to, { width: 0.1, height: 0.1 }, 0)
      }
    }
  }

  // Add padding to bounds
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  return { minX, minY, maxX, maxY }

  function updateBounds(center: any, size: any, rotation: number) {
    const corners = [
      { x: -size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: size.height / 2 },
      { x: -size.width / 2, y: size.height / 2 },
    ]

    for (const corner of corners) {
      const rotatedX =
        corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation) + center.x
      const rotatedY =
        corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation) + center.y
      minX = Math.min(minX, rotatedX)
      minY = Math.min(minY, rotatedY)
      maxX = Math.max(maxX, rotatedX)
      maxY = Math.max(maxY, rotatedY)
    }
  }
}
