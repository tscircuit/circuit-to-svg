import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/circuit-json-util"
import { createSvgObjectsForSchPortBoxLine } from "./create-svg-objects-for-sch-port-box-line"
import { createSvgObjectsForSchPortPinNumberText } from "./create-svg-objects-for-sch-port-pin-number-text"
import { createSvgObjectsForSchPortPinLabel } from "./create-svg-objects-for-sch-port-pin-label"
import type { ColorMap } from "lib/utils/colors"
import { createSvgObjectsForNotConnectedSymbol } from "./create-svg-objects-for-not-connected-symbol"

export const createSvgObjectsFromSchPortOnBox = (params: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []
  const { schPort, schComponent, transform, circuitJson, colorMap } = params

  svgObjects.push(...createSvgObjectsForSchPortBoxLine(params))
  svgObjects.push(...createSvgObjectsForSchPortPinNumberText(params))
  svgObjects.push(...createSvgObjectsForSchPortPinLabel(params))
  svgObjects.push(
    ...createSvgObjectsForNotConnectedSymbol({
      schPort,
      transform,
      colorMap,
    }),
  )

  return svgObjects
}
