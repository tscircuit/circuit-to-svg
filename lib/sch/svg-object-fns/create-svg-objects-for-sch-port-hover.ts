import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { type Matrix, applyToPoint } from "transformation-matrix"

const PIN_CIRCLE_RADIUS_MM = 0.02

export const createSvgObjectsForSchPortHover = ({
  schPort,
  transform,
}: {
  schPort: SchematicPort
  transform: Matrix
}): SvgObject[] => {
  const screenSchPortPos = applyToPoint(transform, schPort.center)
  const pinRadiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM * 2

  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "schematic-port-hover",
        "data-schematic-port-id": schPort.source_port_id,
      },
      children: [
        {
          name: "circle",
          type: "element",
          value: "",
          attributes: {
            cx: screenSchPortPos.x.toString(),
            cy: screenSchPortPos.y.toString(),
            r: pinRadiusPx.toString(),
            fill: "red",
            opacity: "0",
          },
          children: [],
        },
      ],
    },
  ]
}

export const createSvgObjectsForSchComponentPortHovers = ({
  component,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const schematicPorts = su(circuitJson as any).schematic_port.list({
    schematic_component_id: component.schematic_component_id,
  }) as SchematicPort[]

  const svgs: SvgObject[] = []
  for (const schPort of schematicPorts) {
    svgs.push(...createSvgObjectsForSchPortHover({ schPort, transform }))
  }

  return svgs
}
