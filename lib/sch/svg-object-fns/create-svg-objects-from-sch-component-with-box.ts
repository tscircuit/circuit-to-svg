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
      "stroke-width": "2px",
    },
    children: [],
  })

  // // Add manufacturer number and component name text
  // if (manufacturerNumber) {
  //   // Calculate position for top center of component
  //   const [textX, textY] = applyToPoint(transform, [
  //     schComponent.center.x, // Center X position
  //     schComponent.center.y - schComponent.size.height / 2 - 0.5, // Above the component top edge
  //   ])

  //   const labelOffset = componentScale * 0.4

  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: textY.toString(),
  //       "text-anchor": "right", // Center align text
  //       "dominant-baseline": "auto",
  //       "font-size": "0.2",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: manufacturerNumber,
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })

  //   // Component name below manufacturer number
  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: (textY - labelOffset).toString(),
  //       "text-anchor": "right", // Center align text
  //       "dominant-baseline": "auto",
  //       "font-size": "0.2",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: componentName || "",
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })
  // }

  // // Process ports
  const schematicPorts = su(circuitJson as any).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id,
  }) as SchematicPort[]
  const pinLineLength = 0.2
  const pinCircleRadius = 0.05

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

  // // Create component group with scaling
  // const componentGroup: SvgObject = {
  //   name: "g",
  //   value: "",
  //   type: "element",
  //   attributes: {},
  //   children: svgObjects,
  // }

  // // Create text group without scaling
  // const textGroup: SvgObject = {
  //   name: "g",
  //   value: "",
  //   type: "element",
  //   attributes: {},
  //   children: textChildren,
  // }

  // return [componentGroup, textGroup]
  return svgObjects
}
