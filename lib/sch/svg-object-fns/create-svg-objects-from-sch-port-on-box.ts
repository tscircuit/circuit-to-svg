import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/soup-util"
import { createSvgObjectsForSchPortBoxLine } from "./create-svg-objects-for-sch-port-box-line"
import { createSvgObjectsForSchPortPinNumberText } from "./create-svg-objects-for-sch-port-pin-number-text"
import { createSvgObjectsForSchPortPinLabel } from "./create-svg-objects-for-sch-port-pin-label"

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
