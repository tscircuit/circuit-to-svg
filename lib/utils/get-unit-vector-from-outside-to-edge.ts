/**
 * Given a side, gives you the unit vector you would move in if you were coming
 * towards that edge from the outside. This is the same as the unit vector from
 * a port to the edge of a schematic box. This function assumes cartesian
 * coordinates (Y positive is up)
 */
export const getUnitVectorFromOutsideToEdge = (
  side: "top" | "bottom" | "left" | "right",
) => {
  switch (side) {
    case "top":
      return { x: 0, y: -1 }
    case "bottom":
      return { x: 0, y: 1 }
    case "left":
      return { x: 1, y: 0 }
    case "right":
      return { x: -1, y: 0 }
  }
  throw new Error(`Invalid side: ${side}`)
}
