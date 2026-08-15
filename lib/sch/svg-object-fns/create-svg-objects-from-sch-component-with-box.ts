import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
  SourceSimpleChip,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsFromSchPortOnBox } from "./create-svg-objects-from-sch-port-on-box"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { createSvgSchText } from "./create-svg-objects-for-sch-text"

export const createSvgObjectsFromSchematicComponentWithBox = ({
  component: schComponent,
  transform,
  circuitJson,
  colorMap,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  const rawWidth = schComponent.size?.width
  const rawHeight = schComponent.size?.height
  const safeWidth =
    typeof rawWidth === "number" && Number.isFinite(rawWidth)
      ? Math.abs(rawWidth)
      : 0
  const safeHeight =
    typeof rawHeight === "number" && Number.isFinite(rawHeight)
      ? Math.abs(rawHeight)
      : 0

  const centerX =
    typeof schComponent.center?.x === "number" &&
    Number.isFinite(schComponent.center.x)
      ? schComponent.center.x
      : 0
  const centerY =
    typeof schComponent.center?.y === "number" &&
    Number.isFinite(schComponent.center.y)
      ? schComponent.center.y
      : 0

  const halfWidth = safeWidth / 2
  const halfHeight = safeHeight / 2

  const p1 = applyToPoint(transform, {
    x: centerX - halfWidth,
    y: centerY + halfHeight,
  })
  const p2 = applyToPoint(transform, {
    x: centerX + halfWidth,
    y: centerY - halfHeight,
  })

  const componentScreenTopLeft = {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
  }
  const componentScreenWidth = Math.abs(p2.x - p1.x)
  const componentScreenHeight = Math.abs(p2.y - p1.y)

  // Add basic rectangle for component body
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component chip sch-component-body",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
      fill: colorMap.schematic.component_body,
      stroke: colorMap.schematic.component_outline,
    },
    children: [],
  })

  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay sch-component-overlay",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      fill: "transparent",
    },
    children: [],
  })

  const schTexts = su(circuitJson as any).schematic_text.list()

  for (const schText of schTexts) {
    if (
      schText.schematic_component_id === schComponent.schematic_component_id
    ) {
      svgObjects.push(
        createSvgSchText({
          elm: schText,
          transform,
          colorMap,
        }),
      )
    }
  }
  // // Process ports
  const schematicPorts = su(circuitJson as any).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id,
  }) as SchematicPort[]

  for (const schPort of schematicPorts) {
    svgObjects.push(
      ...createSvgObjectsFromSchPortOnBox({
        schPort,
        schComponent,
        transform,
        circuitJson,
      }),
    )
  }

  return svgObjects
}
