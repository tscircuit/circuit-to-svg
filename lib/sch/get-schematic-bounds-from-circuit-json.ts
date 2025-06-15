import type { AnyCircuitElement } from "circuit-json"
import { getSchMmFontSize } from "lib/utils/get-sch-font-size"
import {
  ARROW_POINT_WIDTH_FSR,
  END_PADDING_EXTRA_PER_CHARACTER_FSR,
  END_PADDING_FSR,
  getPathRotation,
  calculateAnchorPosition,
} from "lib/utils/net-label-utils"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import { estimateTextWidth } from "./estimate-text-width"
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
      updateBounds(item.center, item.size, 0)
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
      const fontSizeMm = getSchMmFontSize("net_label")
      const textWidth = estimateTextWidth(item.text || "")
      const fullWidthFsr =
        textWidth +
        ARROW_POINT_WIDTH_FSR * 2 +
        END_PADDING_EXTRA_PER_CHARACTER_FSR * (item.text?.length || 0) +
        END_PADDING_FSR
      const width = fullWidthFsr * fontSizeMm
      const height = 1.2 * fontSizeMm
      const rotation = (getPathRotation(item.anchor_side) / 180) * Math.PI

      const anchorPosition = calculateAnchorPosition(
        item,
        fontSizeMm,
        textWidth,
      )
      const growthVec = getUnitVectorFromOutsideToEdge(item.anchor_side)
      const center = {
        x: anchorPosition.x + (growthVec.x * width) / 2,
        y: anchorPosition.y + (growthVec.y * width) / 2,
      }

      updateBounds(center, { width, height }, rotation)
    } else if (item.type === "schematic_trace") {
      for (const edge of item.edges) {
        updateBounds(edge.from, { width: 0.1, height: 0.1 }, 0)
        updateBounds(edge.to, { width: 0.1, height: 0.1 }, 0)
      }
    } else if (item.type === "schematic_text") {
      const textType = "reference_designator"
      const fontSize = getSchMmFontSize(textType, item.font_size) ?? 0.18
      const text = item.text ?? ""
      const width = text.length * fontSize
      const height = fontSize
      updateBounds(item.position, { width, height }, item.rotation ?? 0)
    } else if (item.type === "schematic_voltage_probe") {
      updateBounds(item.position, { width: 0.2, height: 0.4 }, 0) // width and height of the probe (Arrow)
    } else if (item.type === "schematic_box") {
      updateBounds(
        {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
        },
        { width: item.width, height: item.height },
        0,
      )
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
