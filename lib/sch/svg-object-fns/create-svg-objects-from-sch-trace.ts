import type { SchematicTrace } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSchematicTrace({
  trace,
  transform,
  colorMap,
}: {
  trace: SchematicTrace
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const edges = trace.edges
  if (edges.length === 0) return []
  // Split into base vs overlay to control global z-order
  const baseObjects: SvgObject[] = []
  const overlayObjects: SvgObject[] = []

  let path = ""

  // Process edges into an SVG path
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex]!

    if (edge.is_crossing) continue

    // Transform the points using the matrix
    const [screenFromX, screenFromY] = applyToPoint(transform, [
      edge.from.x,
      edge.from.y,
    ])
    const [screenToX, screenToY] = applyToPoint(transform, [
      edge.to.x,
      edge.to.y,
    ])

    // Regular straight line for non-crossing traces
    if (edgeIndex === 0 || edges[edgeIndex - 1]?.is_crossing) {
      path += `M ${screenFromX} ${screenFromY} L ${screenToX} ${screenToY}`
    } else {
      path += ` L ${screenToX} ${screenToY}`
    }
  }

  // Note: draw the base wire first (below), then draw
  // the crossing outline + hop on top for correct z-ordering.

  if (path) {
    // Makes hovering over trace (which inverts the colors) easier
    baseObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: path,
        class: "trace-invisible-hover-outline",
        stroke: colorMap.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) * 8}px`,
        "stroke-linecap": "round",
        opacity: "0",
        "stroke-linejoin": "round",
      },
      value: "",
      children: [],
    })
    baseObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: path,
        stroke: colorMap.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      value: "",
      children: [],
    })
  }

  // Process wire crossings with little "hops" or arcs
  // These must be added AFTER the base wire so they render on top.
  for (const edge of edges) {
    if (!edge.is_crossing) continue

    // Transform the points using the matrix
    const [screenFromX, screenFromY] = applyToPoint(transform, [
      edge.from.x,
      edge.from.y,
    ])
    const [screenToX, screenToY] = applyToPoint(transform, [
      edge.to.x,
      edge.to.y,
    ])
    // For crossing traces, create a small arc/hop
    const midX = (screenFromX + screenToX) / 2
    const midY = (screenFromY + screenToY) / 2

    // Calculate perpendicular offset for the arc
    const dx = screenToX - screenFromX
    const dy = screenToY - screenFromY
    const len = Math.sqrt(dx * dx + dy * dy)
    const hopHeight = len * 0.7

    // Perpendicular vector
    const perpX = (-dy / len) * hopHeight
    const perpY = (dx / len) * hopHeight

    // Control point for the quadratic curve
    const controlX = midX + perpX
    const controlY = midY - Math.abs(perpY)

    // Arc Shadow (masking the underlying wire under the hop)
    // Arc Shadow (masking the underlying wire under the hop)
    overlayObjects.push({
      name: "path",
      type: "element",
      attributes: {
        class: "trace-crossing-outline",
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap.schematic.background,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) * 1.5}px`,
        "stroke-linecap": "butt",
      },
      value: "",
      children: [],
    })
    // Hop stroke on top
    overlayObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
  }

  // Add junction circles
  if (trace.junctions) {
    for (const junction of trace.junctions) {
      const [screenX, screenY] = applyToPoint(transform, [
        junction.x,
        junction.y,
      ])
      // Draw junctions above wires
      overlayObjects.push({
        name: "circle",
        type: "element",
        attributes: {
          cx: screenX.toString(),
          cy: screenY.toString(),
          r: (Math.abs(transform.a) * 0.03).toString(),
          class: "trace-junction",
          fill: colorMap.schematic.junction,
        },
        value: "",
        children: [],
      })
    }
  }

  // Return separate groups for base and overlays
  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "trace",
        "data-layer": "base",
        "data-circuit-json-type": "schematic_trace",
        "data-schematic-trace-id": trace.schematic_trace_id,
        ...(trace.subcircuit_connectivity_map_key && {
          "data-subcircuit-connectivity-map-key":
            trace.subcircuit_connectivity_map_key,
        }),
      },
      children: baseObjects,
    },
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "trace-overlays",
        "data-layer": "overlay",
        "data-circuit-json-type": "schematic_trace",
        "data-schematic-trace-id": trace.schematic_trace_id,
        ...(trace.subcircuit_connectivity_map_key && {
          "data-subcircuit-connectivity-map-key":
            trace.subcircuit_connectivity_map_key,
        }),
      },
      children: overlayObjects,
    },
  ]
}
