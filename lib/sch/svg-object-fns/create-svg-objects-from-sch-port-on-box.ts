import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { type Matrix, applyToPoint } from "transformation-matrix"
import { createSvgObjectsForSchPortBoxLine } from "./create-svg-objects-for-sch-port-box-line"
import { createSvgObjectsForSchPortPinLabel } from "./create-svg-objects-for-sch-port-pin-label"
import { createSvgObjectsForSchPortPinNumberText } from "./create-svg-objects-for-sch-port-pin-number-text"

export const createSvgObjectsFromSchPortOnBox = (params: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const { schPort, schComponent, transform, circuitJson } = params

  svgObjects.push(...createSvgObjectsForSchPortBoxLine(params))
  svgObjects.push(...createSvgObjectsForSchPortPinNumberText(params))
  svgObjects.push(...createSvgObjectsForSchPortPinLabel(params))

  return svgObjects
}
