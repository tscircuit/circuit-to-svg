import type { AnyCircuitElement, SchematicPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { getSchematicBoundsFromCircuitJson } from "../get-schematic-bounds-from-circuit-json"
import {
  getSchematicDiagnosticCalloutLayout,
  type ScreenBounds,
} from "./schematic-diagnostic-callout-layout"

/**
 * Resolve error references against the visible sheet's ports. Port centers are
 * schematic world points in mm (+X right, +Y up); transform projects them to SVG
 * screen points in pixels (+X right, +Y down). Marker radii are screen pixels.
 */
export function createSvgObjectsFromSourcePortErrors({
  circuitJson,
  transform,
  svgWidth,
  svgHeight,
}: {
  circuitJson: AnyCircuitElement[]
  transform: Matrix
  svgWidth: number
  svgHeight: number
}): SvgObject[] {
  const occupiedCalloutBounds = getComponentScreenBounds(circuitJson, transform)
  return circuitJson.flatMap((error) => {
    const references = getSourcePortErrorReferences(error)
    if (!references) return []
    const ports = circuitJson.filter(
      (port): port is SchematicPort =>
        port.type === "schematic_port" &&
        references.sourcePortIds.includes(port.source_port_id),
    )
    const firstPort = ports[0]
    if (!firstPort) return []

    const markers = ports.flatMap((port): SvgObject[] => {
      const center = applyToPoint(transform, port.center)
      return [
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: center.x.toString(),
            cy: center.y.toString(),
            r: "9",
            fill: "red",
            "fill-opacity": "0.15",
            stroke: "red",
            "stroke-width": "2",
            "data-type": error.type,
            "data-source-port-id": port.source_port_id,
            "data-error-id": references.errorId,
            "aria-label": references.message,
          },
          children: [
            {
              name: "title",
              type: "element",
              value: "",
              attributes: {},
              children: [
                {
                  name: "",
                  type: "text",
                  value: references.message,
                  attributes: {},
                  children: [],
                },
              ],
            },
          ],
        },
      ]
    })
    const center = applyToPoint(transform, firstPort.center)
    const { placement, leader, messageLines, calloutWidth, calloutHeight } =
      getSchematicDiagnosticCalloutLayout({
        message: references.message,
        targetBounds: {
          minX: center.x - 9,
          minY: center.y - 9,
          maxX: center.x + 9,
          maxY: center.y + 9,
        },
        svgWidth,
        svgHeight,
        occupiedCalloutBounds,
      })
    return [
      ...markers,
      {
        name: "g",
        type: "element",
        value: "",
        attributes: {
          "data-type": "source_port_error_callout",
          "data-error-type": error.type,
          "data-error-id": references.errorId,
          "data-source-port-id": firstPort.source_port_id,
          "aria-label": references.message,
          role: "note",
        },
        children: [
          {
            name: "line",
            type: "element",
            value: "",
            children: [],
            attributes: {
              x1: leader.from.x.toString(),
              y1: leader.from.y.toString(),
              x2: leader.to.x.toString(),
              y2: leader.to.y.toString(),
              stroke: "red",
              "stroke-width": "1",
            },
          },
          {
            name: "rect",
            type: "element",
            value: "",
            children: [],
            attributes: {
              x: placement.minX.toString(),
              y: placement.minY.toString(),
              width: calloutWidth.toString(),
              height: calloutHeight.toString(),
              fill: "rgba(255, 245, 245, 0.97)",
              stroke: "red",
              "stroke-width": "1",
            },
          },
          {
            name: "text",
            type: "element",
            value: "",
            attributes: {
              x: (placement.minX + 6).toString(),
              y: (placement.minY + 17).toString(),
              fill: "#a00000",
              "font-family": "sans-serif",
              "font-size": "11",
            },
            children: messageLines.map(
              (line, index): SvgObject => ({
                name: "tspan",
                type: "element",
                value: "",
                attributes: {
                  x: (placement.minX + 6).toString(),
                  dy: index === 0 ? "0" : "14",
                },
                children: [
                  {
                    name: "",
                    type: "text",
                    value: line,
                    attributes: {},
                    children: [],
                  },
                ],
              }),
            ),
          },
        ],
      } satisfies SvgObject,
    ]
  })
}

/** Project component and label bounds from schematic world mm to SVG screen pixels. */
function getComponentScreenBounds(
  circuitJson: AnyCircuitElement[],
  transform: Matrix,
): ScreenBounds[] {
  return circuitJson.flatMap((component) => {
    if (component.type !== "schematic_component") return []
    const bounds = getSchematicBoundsFromCircuitJson(
      circuitJson.filter((element) =>
        element.type === "source_component"
          ? element.source_component_id === component.source_component_id
          : "schematic_component_id" in element &&
            element.schematic_component_id === component.schematic_component_id,
      ),
      0,
    )
    const corners = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.minX, y: bounds.maxY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
    ].map((point) => applyToPoint(transform, point))
    return [
      {
        minX: Math.min(...corners.map((point) => point.x)),
        minY: Math.min(...corners.map((point) => point.y)),
        maxX: Math.max(...corners.map((point) => point.x)),
        maxY: Math.max(...corners.map((point) => point.y)),
      },
    ]
  })
}

function getSourcePortErrorReferences(error: AnyCircuitElement) {
  switch (error.type) {
    case "source_component_misconfigured_error":
      return {
        errorId: error.source_component_misconfigured_error_id,
        sourcePortIds: error.source_port_ids ?? [],
        message: error.message,
      }
    case "source_pin_must_be_connected_error":
      return {
        errorId: error.source_pin_must_be_connected_error_id,
        sourcePortIds: [error.source_port_id],
        message: error.message,
      }
    case "source_i2c_misconfigured_error":
      return {
        errorId: error.source_i2c_misconfigured_error_id,
        sourcePortIds: error.source_port_ids,
        message: error.message,
      }
    case "source_trace_not_connected_error":
      return {
        errorId: error.source_trace_not_connected_error_id,
        sourcePortIds: error.connected_source_port_ids ?? [],
        message: error.message,
      }
  }
}
