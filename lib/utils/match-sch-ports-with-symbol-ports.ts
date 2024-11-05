import type { SchematicComponent, SchematicPort } from "circuit-json"
import type { SchSymbol } from "schematic-symbols"

// export const matchSchPortsToSymbolPorts = ({
//   schPorts,
//   symbol,
//   schComponent,
// }: {
//   schPorts: SchematicPort[]
//   schComponent: SchematicComponent
//   symbol: SchSymbol
// }): Array<{
//   schPort: SchematicPort
//   symbolPort: SchSymbol["ports"][number]
// }> => {
//   // schPorts is Array<{ center: { x: number; y: number } }>
//   // schComponent.center is { x: number; y: number }
//   // symbol.ports is Array<{ x: number; y: number }>
//   // symbol.center is { x: number; y: number }
//   // Use the angles from the schComponent center to the schPorts to match with the angles from the symbol center to the symbol ports
//   // If a port isn't matched because there are more schPorts than symbolPorts (or vice versa), then the unmatched ports should be ignored (not returned)
// }

// Helper function to calculate smallest angular difference accounting for wraparound
const getAngularDifference = (angle1: number, angle2: number): number => {
  // Convert from [-π, π] to [0, 2π] for easier comparison
  const a1 = angle1 < 0 ? angle1 + 2 * Math.PI : angle1
  const a2 = angle2 < 0 ? angle2 + 2 * Math.PI : angle2

  // Calculate direct difference
  let diff = Math.abs(a1 - a2)
  // If the difference is greater than π, then the smaller angle is going the other way around
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff
  }
  return diff
}

export const matchSchPortsToSymbolPorts = ({
  schPorts,
  symbol,
  schComponent,
}: {
  schPorts: SchematicPort[]
  schComponent: SchematicComponent
  symbol: SchSymbol
}): Array<{
  schPort: SchematicPort
  symbolPort: SchSymbol["ports"][number]
}> => {
  // Calculate angles for schematic ports
  const schPortAngles = schPorts.map((port) => {
    const dx = port.center.x - schComponent.center.x
    const dy = port.center.y - schComponent.center.y
    return {
      port,
      angle: Math.atan2(dy, dx),
    }
  })

  // Calculate angles for symbol ports
  const symbolPortAngles = symbol.ports.map((port) => {
    const dx = port.x - symbol.center.x
    const dy = port.y - symbol.center.y
    return {
      port,
      angle: Math.atan2(dy, dx),
    }
  })

  // Sort both arrays by angle to help with initial matching
  // Note: The sorting is less critical now that we handle wraparound properly
  schPortAngles.sort((a, b) => a.angle - b.angle)
  symbolPortAngles.sort((a, b) => a.angle - b.angle)

  const matches: Array<{
    schPort: SchematicPort
    symbolPort: SchSymbol["ports"][number]
  }> = []

  // Keep track of used symbol ports to avoid duplicate matches
  const usedSymbolPorts = new Set<SchSymbol["ports"][number]>()

  // For each schematic port, find the best matching symbol port
  for (const schPortAngle of schPortAngles) {
    let bestMatch: {
      symbolPort: SchSymbol["ports"][number]
      angleDiff: number
    } | null = null

    // Compare against all available symbol ports
    for (const symbolPortAngle of symbolPortAngles) {
      // Skip if this symbol port is already matched
      if (usedSymbolPorts.has(symbolPortAngle.port)) continue

      const angleDiff = getAngularDifference(
        schPortAngle.angle,
        symbolPortAngle.angle,
      )

      if (bestMatch === null || angleDiff < bestMatch.angleDiff) {
        bestMatch = {
          symbolPort: symbolPortAngle.port,
          angleDiff,
        }
      }
    }

    // If we found a match and the angular difference is reasonable (e.g., less than 45 degrees)
    if (bestMatch && bestMatch.angleDiff < Math.PI / 4) {
      matches.push({
        schPort: schPortAngle.port,
        symbolPort: bestMatch.symbolPort,
      })
      usedSymbolPorts.add(bestMatch.symbolPort)
    }
  }

  return matches
}
