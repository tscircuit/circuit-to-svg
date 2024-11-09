export const getUnitVectorFromEdgeToOutside = (
  side: "top" | "bottom" | "left" | "right",
) => {
  switch (side) {
    case "top":
      return { x: 0, y: 1 }
    case "bottom":
      return { x: 0, y: -1 }
    case "left":
      return { x: -1, y: 0 }
    case "right":
      return { x: 1, y: 0 }
  }
  throw new Error(`Invalid side: ${side}`)
}
