import type { NinePointAnchor, Point } from "circuit-json"

export function getSvgTextAnchorAlignment(
  anchorAlignment: NinePointAnchor | undefined,
): {
  textAnchor: "start" | "middle" | "end"
  dominantBaseline: "central" | "text-before-edge" | "text-after-edge"
} {
  switch (anchorAlignment) {
    case "top_left":
      return {
        textAnchor: "start",
        dominantBaseline: "text-before-edge",
      }
    case "top_center":
      return {
        textAnchor: "middle",
        dominantBaseline: "text-before-edge",
      }
    case "top_right":
      return {
        textAnchor: "end",
        dominantBaseline: "text-before-edge",
      }
    case "center_left":
      return {
        textAnchor: "start",
        dominantBaseline: "central",
      }
    case "center_right":
      return {
        textAnchor: "end",
        dominantBaseline: "central",
      }
    case "bottom_left":
      return {
        textAnchor: "start",
        dominantBaseline: "text-after-edge",
      }
    case "bottom_center":
      return {
        textAnchor: "middle",
        dominantBaseline: "text-after-edge",
      }
    case "bottom_right":
      return {
        textAnchor: "end",
        dominantBaseline: "text-after-edge",
      }
    case "center":
    default:
      return {
        textAnchor: "middle",
        dominantBaseline: "central",
      }
  }
}

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
