import type { SchematicTrace } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

export function createSchematicTrace(
  trace: SchematicTrace,
  // TODO needs to take transform, deprecate flipY!
  flipY: (y: number) => number,
  // Deprecate portPositions, use su(circuitJson).get(port_id).center instead
  portPositions: Map<string, { x: number; y: number }>,
): SvgObject[] {
  const edges = trace.edges
  if (edges.length === 0) return []

  let path = ""

  // Process all edges
  edges.forEach((edge: any, index: number) => {
    const fromPoint =
      edge.from.ti !== undefined ? portPositions.get(edge.from.ti) : edge.from
    const toPoint =
      edge.to.ti !== undefined ? portPositions.get(edge.to.ti) : edge.to

    if (!fromPoint || !toPoint) {
      return
    }

    const fromCoord = `${fromPoint.x - 0.15} ${flipY(fromPoint.y)}`
    const toCoord = `${toPoint.x + 0.15} ${flipY(toPoint.y)}`

    if (index === 0) {
      path += `M ${fromCoord} L ${toCoord}`
    } else {
      path += ` L ${toCoord}`
    }
  })

  // Handle connection to final port if needed
  // if (trace.to_schematic_port_id) {
  //   const finalPort = portPositions.get(trace.to_schematic_port_id)
  //   if (finalPort) {
  //     const lastFromPoint = path.split("M")[1]?.split("L")[0]
  //     const lastEdge = edges[edges.length - 1]
  //     const lastPoint =
  //       lastEdge.to.ti !== undefined
  //         ? portPositions.get(lastEdge.to.ti)
  //         : lastEdge.to
  //     if (lastPoint.x !== finalPort.x || lastPoint.y !== finalPort.y) {
  //       const finalCoord = `${finalPort.x} ${flipY(finalPort.y)}`
  //       path += ` M ${lastFromPoint} L ${finalCoord}`
  //     }
  //   }
  // }
  return path
    ? ([
        {
          name: "path",
          type: "element",
          attributes: {
            class: "trace",
            d: path,
          },
          value: "",
          children: [],
        },
      ] as SvgObject[])
    : []
}
