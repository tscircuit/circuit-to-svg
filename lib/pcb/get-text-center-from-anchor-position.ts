import type { NinePointAnchor, Point } from "circuit-json"

export function getTextCenterFromAnchorPosition({
  anchorPosition,
  textWidth,
  textHeight,
  anchorAlignment,
}: {
  anchorPosition: Point
  textWidth: number
  textHeight: number
  anchorAlignment: NinePointAnchor | undefined
}): Point {
  switch (anchorAlignment) {
    case "top_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y + textHeight / 2,
      }
    case "top_center":
      return {
        x: anchorPosition.x,
        y: anchorPosition.y + textHeight / 2,
      }
    case "top_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y + textHeight / 2,
      }
    case "center_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y,
      }
    case "center_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y,
      }
    case "bottom_left":
      return {
        x: anchorPosition.x + textWidth / 2,
        y: anchorPosition.y - textHeight / 2,
      }
    case "bottom_center":
      return {
        x: anchorPosition.x,
        y: anchorPosition.y - textHeight / 2,
      }
    case "bottom_right":
      return {
        x: anchorPosition.x - textWidth / 2,
        y: anchorPosition.y - textHeight / 2,
      }
    case "center":
    default:
      return anchorPosition
  }
}
