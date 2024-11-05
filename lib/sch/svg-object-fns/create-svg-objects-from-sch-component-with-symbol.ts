import { su } from "@tscircuit/soup-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSvg, symbols, type SchSymbol } from "schematic-symbols"
import { parseSync } from "svgson"
import {
  applyToPoint,
  compose,
  translate,
  type Matrix,
} from "transformation-matrix"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"

export const createSvgObjectsFromSchematicComponentWithSymbol = ({
  component: schComponent,
  transform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  const symbol: SchSymbol = (symbols as any)[schComponent.symbol_name!]
  console.log(schComponent.symbol_name)

  if (!symbol) return []

  const { center, ports, primitives, size } = symbol

  const paths = primitives.filter((p) => p.type === "path")
  const texts = primitives.filter((p) => p.type === "text")
  const circles = primitives.filter((p) => p.type === "circle")
  const boxes = primitives.filter((p) => p.type === "box")

  for (const path of paths) {
    const { points, color, closed, fill } = path
    svgObjects.push({
      type: "element",
      name: "path",
      attributes: {
        d:
          points
            .map((p, i) => {
              const [x, y] = applyToPoint(
                compose(
                  transform,
                  translate(schComponent.center.x, schComponent.center.y),
                ),
                [p.x, p.y],
              )
              return `${i === 0 ? "M" : "L"} ${x} ${y}`
            })
            .join(" ") + (closed ? " Z" : ""),
        stroke: colorMap.schematic.component_outline,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
      },
      value: "",
      children: [],
    })
  }

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
