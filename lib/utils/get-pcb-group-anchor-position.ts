import type { PcbGroup, Point } from "circuit-json"

/**
 * Calculates the anchor position for a PCB group.
 * Priority:
 * 1. If anchor_position is provided, use it directly
 * 2. If anchor_alignment is provided, calculate from center, width, height
 * 3. Otherwise, fall back to center
 */
export function getPcbGroupAnchorPosition(
  group: PcbGroup,
): { x: number; y: number } | undefined {
  const { center, width, height, anchor_position, anchor_alignment } = group

  // If anchor_position is explicitly provided, use it
  if (
    anchor_position &&
    typeof anchor_position.x === "number" &&
    typeof anchor_position.y === "number"
  ) {
    return anchor_position
  }

  // If center is not available, we can't calculate anchor position
  if (!center || typeof center.x !== "number" || typeof center.y !== "number") {
    return undefined
  }

  // If anchor_alignment is provided, calculate anchor position from alignment
  if (anchor_alignment && width && height) {
    const halfWidth = width / 2
    const halfHeight = height / 2

    switch (anchor_alignment) {
      case "top_left":
        return {
          x: center.x - halfWidth,
          y: center.y + halfHeight,
        }
      case "top_right":
        return {
          x: center.x + halfWidth,
          y: center.y + halfHeight,
        }
      case "bottom_left":
        return {
          x: center.x - halfWidth,
          y: center.y - halfHeight,
        }
      case "bottom_right":
        return {
          x: center.x + halfWidth,
          y: center.y - halfHeight,
        }
      case "center":
      default:
        return center
    }
  }

  // Fall back to center
  return center
}

