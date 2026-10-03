import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"

/**
 * Resolve error references against the visible sheet's ports. Port centers are
 * schematic world points in mm (+X right, +Y up); transform projects them to SVG
 * screen points in pixels (+X right, +Y down). Marker radii are screen pixels.
 */
export function createSvgObjectsFromSourceComponentMisconfiguredErrors({
  circuitJson,
  transform,
}: {
  circuitJson: AnyCircuitElement[]
  transform: Matrix
}): SvgObject[] {
  return circuitJson.flatMap((error) => {
    if (error.type !== "source_component_misconfigured_error") return []

    return circuitJson.flatMap((port): SvgObject[] => {
      if (
        port.type !== "schematic_port" ||
        !error.source_port_ids?.includes(port.source_port_id)
      ) {
        return []
      }

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
            "data-error-id": error.source_component_misconfigured_error_id,
            "aria-label": error.message,
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
                  value: error.message,
                  attributes: {},
                  children: [],
                },
              ],
            },
          ],
        },
      ]
    })
  })
}
