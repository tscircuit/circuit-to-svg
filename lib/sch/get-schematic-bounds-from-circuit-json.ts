import type { AnyCircuitElement } from "circuit-json"
import { getTableDimensions } from "./get-table-dimensions"
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

      if (item.name) {
        const fontSize = getSchMmFontSize("net_label")
        const textWidth = estimateTextWidth(item.name) * fontSize
        const textHeight = fontSize
        const labelOffset = 0.3

        const alignment = item.label_alignment ?? "top_right"
        let labelCenterX = item.position.x
        let labelCenterY = item.position.y

        // Offset based on alignment
        if (alignment.includes("top")) {
          labelCenterY += labelOffset + textHeight / 2
        } else if (alignment.includes("bottom")) {
          labelCenterY -= labelOffset + textHeight / 2
        }

        if (alignment.includes("right")) {
          labelCenterX += labelOffset + textWidth / 2
        } else if (alignment.includes("left")) {
          labelCenterX -= labelOffset + textWidth / 2
        }

        updateBounds(
          { x: labelCenterX, y: labelCenterY },
          { width: textWidth, height: textHeight },
          0,
        )
      }
    } else if (item.type === "schematic_box") {
      updateBounds(
        {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
        },
        { width: item.width, height: item.height },
        0,
      )
    } else if (item.type === "schematic_table") {
      const { column_widths, row_heights } = getTableDimensions(item, soup)
      const totalWidth = column_widths.reduce((a, b) => a + b, 0)
      const totalHeight = row_heights.reduce((a, b) => a + b, 0)
      const anchor = item.anchor ?? "center"

      let topLeftX = item.anchor_position.x
      let topLeftY = item.anchor_position.y

      // Horizontal alignment
      if (anchor.includes("center")) {
        topLeftX -= totalWidth / 2
      } else if (anchor.includes("right")) {
        topLeftX -= totalWidth
      }

      // Vertical alignment
      if (anchor.includes("center")) {
        topLeftY += totalHeight / 2
      } else if (anchor.includes("bottom")) {
        topLeftY += totalHeight
      }

      const centerX = topLeftX + totalWidth / 2
      const centerY = topLeftY - totalHeight / 2

      updateBounds(
        { x: centerX, y: centerY },
        { width: totalWidth, height: totalHeight },
        0,
      )
    } else if (item.type === "schematic_line") {
      updateBounds({ x: item.x1, y: item.y1 }, { width: 0.02, height: 0.02 }, 0)
      updateBounds({ x: item.x2, y: item.y2 }, { width: 0.02, height: 0.02 }, 0)
    } else if (item.type === "schematic_circle") {
      updateBounds(
        item.center,
        { width: item.radius * 2, height: item.radius * 2 },
        0,
      )
    } else if (item.type === "schematic_rect") {
      updateBounds(
        item.center,
        { width: item.width, height: item.height },
        item.rotation,
      )
    } else if (item.type === "schematic_arc") {
      updateBounds(
        item.center,
        { width: item.radius * 2, height: item.radius * 2 },
        0,
      )
    } else if (item.type === "schematic_path") {
      if (item.points && item.points.length > 0) {
        for (const point of item.points) {
          updateBounds(point, { width: 0.02, height: 0.02 }, 0)
        }
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
