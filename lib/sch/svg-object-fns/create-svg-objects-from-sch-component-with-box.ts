import { su } from "@tscircuit/soup-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
  SourceSimpleChip,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "./create-svg-objects-from-sch-component-with-symbol"
import { createSvgObjectsFromSchPortOnBox } from "./create-svg-objects-from-sch-port-on-box"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getSchFontSize } from "lib/utils/get-sch-font-size"

export const createSvgObjectsFromSchematicComponentWithBox = ({
  component: schComponent,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const srcComponent = su(circuitJson as any).source_component.get(
    schComponent.source_component_id,
  )
  const svgObjects: SvgObject[] = []

  const componentScreenTopLeft = applyToPoint(transform, {
    x: schComponent.center.x - schComponent.size.width / 2,
    y: schComponent.center.y + schComponent.size.height / 2,
  })
  const componentScreenBottomRight = applyToPoint(transform, {
    x: schComponent.center.x + schComponent.size.width / 2,
    y: schComponent.center.y - schComponent.size.height / 2,
  })
  const componentScreenWidth =
    componentScreenBottomRight.x - componentScreenTopLeft.x
  const componentScreenHeight =
    componentScreenBottomRight.y - componentScreenTopLeft.y

  // Add basic rectangle for component body
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component chip",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
    },
    children: [],
  })
  // Calculate position for top center of component
  const screenManufacturerNumberPos = applyToPoint(transform, {
    x: schComponent.center.x + schComponent.size.width / 2,
    y: schComponent.center.y + schComponent.size.height / 2 + 0.5, // Above the component top edge
  })
  const fontSizePx = getSchFontSize(transform, "manufacturer_number")

  // Add manufacturer number and component name text
  if (srcComponent?.manufacturer_part_number) {
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        class: "component-name",
        x: screenManufacturerNumberPos.x.toString(),
        y: screenManufacturerNumberPos.y.toString(),
        "font-family": "sans-serif",
        "text-anchor": "right", // Center align text
        "dominant-baseline": "auto",
        "font-size": `${fontSizePx}px`,
      },
      children: [
        {
          type: "text",
          value: srcComponent.manufacturer_part_number,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
  }

  // Component name below manufacturer number
  if (srcComponent?.name) {
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        class: "component-name",
        x: screenManufacturerNumberPos.x.toString(),
        y: (screenManufacturerNumberPos.y + fontSizePx * 1.1).toString(),
        "font-family": "sans-serif",
        "text-anchor": "right", // Center align text
        "dominant-baseline": "auto",
        "font-size": `${fontSizePx}px`,
      },
      children: [
        {
          type: "text",
          value: srcComponent.name || "",
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
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
