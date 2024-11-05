import { su } from "@tscircuit/soup-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols } from "schematic-symbols"
import { parseSync } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const createSvgObjectsFromSchematicComponentWithSymbol = ({
  component,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  // const symbol = (symbols as any)[symbolName]
  // const paths = symbol.primitives.filter((p: any) => p.type === "path")
  // const updatedSymbol = {
  //   ...symbol,
  //   primitives: paths,
  // }
  // const svg = parseSync(
  //   getSvg(updatedSymbol, {
  //     width: component.size.width,
  //     height: component.size.height,
  //   }),
  // )

  // svg.children
  //   .filter(
  //     (child: any) =>
  //       child.name === "path" && child.attributes.fill !== "green",
  //   )
  //   .map((path: any) => {
  //     const currentStrokeWidth = Number.parseFloat(
  //       path.attributes["stroke-width"] || "0.02",
  //     )
  //     return {
  //       ...path,
  //       attributes: {
  //         ...path.attributes,
  //         stroke:
  //           path.attributes.stroke === "black"
  //             ? `${colorMap.schematic.component_outline}`
  //             : path.attributes.stroke,
  //         "stroke-width": currentStrokeWidth.toString(),
  //       },
  //     }
  //   })

  // // Add resistance/capacitance text
  // if (resistance || capacitance) {
  //   const [textX, textY] = applyToPoint(transform, [
  //     component.center.x,
  //     component.center.y - component.size.height / 2 - 0.2,
  //   ])

  //   const labelOffset = componentScale * 0.4
  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: textY.toString(),
  //       "text-anchor": "middle",
  //       "dominant-baseline": "auto",
  //       "font-size": "0.2",
  //     },
  //     children: [
  //       {
  //         type: "text",
  //         value: (resistance || capacitance || "").toString(),
  //         name: "",
  //         attributes: {},
  //         children: [],
  //       },
  //     ],
  //     value: "",
  //   })

  //   textChildren.push({
  //     name: "text",
  //     type: "element",
  //     attributes: {
  //       class: "component-name",
  //       x: textX.toString(),
  //       y: (textY - labelOffset).toString(),
  //       "text-anchor": "middle",
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

  return svgObjects
}
