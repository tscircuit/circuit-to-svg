import type { AnySoupElement, PCBTrace } from "@tscircuit/soup"
import { type INode as SvgObject, stringify } from "svgson"
import { applyToPoint } from "transformation-matrix"

export function createSvgObjectsFromPcbTrace(
  trace: PCBTrace,
  transform: any,
): SvgObject[] {
  if (!trace.route || !Array.isArray(trace.route) || trace.route.length < 2)
    return []

  const cornerRadius = 0.2 // Adjust this value to change the roundness of corners
  const pathCommands: string[] = []
  const transformedPoints = trace.route.map((point: any) =>
    applyToPoint(transform, [point.x, point.y]),
  )

  // Start path
  pathCommands.push(`M ${transformedPoints[0]![0]} ${transformedPoints[0]![1]}`)

  for (let i = 1; i < transformedPoints.length - 1; i++) {
    const prev = transformedPoints[i - 1]
    const curr = transformedPoints[i]
    const next = transformedPoints[i + 1]

    // Calculate vectors
    const v1 = curr && prev ? [curr[0] - prev[0], curr[1] - prev[1]] : [0, 0]
    const v2 = next && curr ? [next[0] - curr[0], next[1] - curr[1]] : [0, 0]

    // Normalize vectors
    const l1 = Math.sqrt(
      (v1[0] as number) * (v1[0] as number) +
        (v1[1] as number) * (v1[1] as number),
    )
    const l2 = Math.sqrt(
      (v2[0] as number) * (v2[0] as number) +
        (v2[1] as number) * (v2[1] as number),
    )
    if (l1 !== 0) {
      v1[0]! /= l1
      v1[1]! /= l1
    }
    if (l2 !== 0) {
      v2[0]! /= l2
      v2[1]! /= l2
    }

    // Calculate the corner points
    const radius = Math.min(cornerRadius, Math.min(l1, l2) / 2)
    const p1 = [curr![0] - v1[0]! * radius, curr![1] - v1[1]! * radius]
    const p2 = [curr![0] + v2[0]! * radius, curr![1] + v2[1]! * radius]

    // Add line to the start of the corner
    pathCommands.push(`L ${p1[0]} ${p1[1]}`)

    // Add the arc
    pathCommands.push(`A ${radius} ${radius} 0 0 1 ${p2[0]} ${p2[1]}`)
  }

  // Add final line to last point
  const lastPoint = transformedPoints[transformedPoints.length - 1]
  pathCommands.push(`L ${lastPoint![0]} ${lastPoint![1]}`)

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-trace",
        d: pathCommands.join(" "),
        "stroke-width":
          // TODO: trace width is on individual points, not on the pcb_trace object
          "width" in trace
            ? ((trace.width as number) * Math.abs(transform.a)).toString()
            : "0.3",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
    },
  ]
}
