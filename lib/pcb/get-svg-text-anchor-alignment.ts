import type { NinePointAnchor } from "circuit-json"

type SvgTextAnchorAlignment = {
  textAnchor: "start" | "middle" | "end"
  dominantBaseline: "central" | "text-before-edge" | "text-after-edge"
}

export function getSvgTextAnchorAlignment(
  anchorAlignment: NinePointAnchor | undefined,
): SvgTextAnchorAlignment {
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
