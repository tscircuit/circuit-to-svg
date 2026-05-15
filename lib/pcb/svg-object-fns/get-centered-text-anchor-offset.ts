import type { NinePointAnchor } from "circuit-json"

export function getCenteredTextAnchorOffset(
  anchorAlignment: NinePointAnchor,
  width: number,
  height: number,
) {
  switch (anchorAlignment) {
    case "top_left":
      return { offsetX: width / 2, offsetY: height / 2 }
    case "top_center":
      return { offsetX: 0, offsetY: height / 2 }
    case "top_right":
      return { offsetX: -width / 2, offsetY: height / 2 }
    case "center_left":
      return { offsetX: width / 2, offsetY: 0 }
    case "center_right":
      return { offsetX: -width / 2, offsetY: 0 }
    case "bottom_left":
      return { offsetX: width / 2, offsetY: -height / 2 }
    case "bottom_center":
      return { offsetX: 0, offsetY: -height / 2 }
    case "bottom_right":
      return { offsetX: -width / 2, offsetY: -height / 2 }
    case "center":
    default:
      return { offsetX: 0, offsetY: 0 }
  }
}
