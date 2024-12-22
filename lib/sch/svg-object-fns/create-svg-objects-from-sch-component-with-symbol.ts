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
import { matchSchPortsToSymbolPorts } from "lib/utils/match-sch-ports-with-symbol-ports"
import { pointPairsToMatrix } from "lib/utils/point-pairs-to-matrix"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import type { TextPrimitive } from "schematic-symbols"
import { createSvgSchErrorText } from "./create-svg-error-text"

const ninePointAnchorToTextAnchor: Record<
  TextPrimitive["anchor"],
  "middle" | "start" | "end"
> = {
  top_left: "start",
  top_right: "end",
  middle_left: "start",
  middle_right: "end",
  bottom_left: "start",
  bottom_right: "end",
  center: "middle",
  middle_top: "middle",
  middle_bottom: "middle",
}

const ninePointAnchorToDominantBaseline: Record<
  TextPrimitive["anchor"],
  "auto" | "hanging" | "middle"
> = {
  top_left: "auto",
  top_right: "auto",
  bottom_left: "hanging",
  bottom_right: "hanging",
  center: "auto",
  middle_left: "middle",
  middle_right: "middle",
  middle_top: "auto",
  middle_bottom: "hanging",
}

export const createSvgObjectsFromSchematicComponentWithSymbol = ({
  component: schComponent,
  transform: realToScreenTransform,
  circuitJson,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  const symbol: SchSymbol = (symbols as any)[schComponent.symbol_name!]

  if (!symbol) {
    return [
      createSvgSchErrorText({
        text: `Symbol not found: ${schComponent.symbol_name}`,
        realCenter: schComponent.center,
        realToScreenTransform,
      }),
    ]
  }

  const schPorts = su(circuitJson as any).schematic_port.list({
    schematic_component_id: schComponent.schematic_component_id,
  }) as SchematicPort[]

  const srcComponent = su(circuitJson as any).source_component.get(
    schComponent.source_component_id,
  )
  // Match schPorts to symbol ports using angle from schematic component center
  const schPortsWithSymbolPorts = matchSchPortsToSymbolPorts({
    schPorts,
    symbol,
    schComponent,
  })

  if (!schPortsWithSymbolPorts[0]) {
    return [
      createSvgSchErrorText({
        text: `Could not match ports for symbol ${schComponent.symbol_name}`,
        realCenter: schComponent.center,
        realToScreenTransform,
      }),
    ]
  }

  const transformFromSymbolToReal = pointPairsToMatrix(
    schPortsWithSymbolPorts[1]?.symbolPort ?? symbol.center,
    schPortsWithSymbolPorts[1]?.schPort.center ?? schComponent.center,
    schPortsWithSymbolPorts[0].symbolPort,
    schPortsWithSymbolPorts[0].schPort.center,
  )

  const paths = symbol.primitives.filter((p) => p.type === "path")
  const texts = symbol.primitives.filter((p) => p.type === "text")
  const circles = symbol.primitives.filter((p) => p.type === "circle")
  const boxes = symbol.primitives.filter((p) => p.type === "box")

  const bounds = {
    minX: Math.min(...paths.flatMap((p) => p.points.map((pt) => pt.x))),
    maxX: Math.max(...paths.flatMap((p) => p.points.map((pt) => pt.x))),
    minY: Math.min(...paths.flatMap((p) => p.points.map((pt) => pt.y))),
    maxY: Math.max(...paths.flatMap((p) => p.points.map((pt) => pt.y))),
  }
  const [screenMinX, screenMinY] = applyToPoint(
    compose(realToScreenTransform, transformFromSymbolToReal),
    [bounds.minX, bounds.minY],
  )

  const [screenMaxX, screenMaxY] = applyToPoint(
    compose(realToScreenTransform, transformFromSymbolToReal),
    [bounds.maxX, bounds.maxY],
  )
  const rectHeight = Math.abs(screenMaxY - screenMinY)
  const rectY = Math.min(screenMinY, screenMaxY)
  const rectWidth = Math.abs(screenMaxX - screenMinX)
  const rectX = Math.min(screenMinX, screenMaxX)
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay",
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "transparent",
    },
    children: [],
  })
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
                compose(realToScreenTransform, transformFromSymbolToReal),
                [p.x, p.y],
              )
              return `${i === 0 ? "M" : "L"} ${x} ${y}`
            })
            .join(" ") + (closed ? " Z" : ""),
        stroke: colorMap.schematic.component_outline,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
      },
      value: "",
      children: [],
    })
  }

  for (const text of texts) {
    const screenTextPos = applyToPoint(
      compose(realToScreenTransform, transformFromSymbolToReal),
      text,
    )

    let textValue = ""
    if (text.text === "{REF}") {
      textValue = srcComponent?.name ?? ""
    } else if (text.text === "{VAL}") {
      textValue = schComponent.symbol_display_value ?? ""
    }

    const symbolHeight = Math.abs(bounds.maxY - bounds.minY)
    const offsetFactor = 0.1
    const baseOffset = symbolHeight * offsetFactor
    const transformScale = Math.abs(transformFromSymbolToReal.a)

    let verticalOffset = 0

    if (text.anchor.includes("bottom")) {
      verticalOffset = baseOffset * transformScale
    } else if (text.anchor.includes("top")) {
      verticalOffset = -baseOffset * transformScale
    }

    const dominantBaseline = text.anchor.includes("bottom")
      ? "auto"
      : text.anchor.includes("top")
        ? "hanging"
        : "middle"

    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        x: screenTextPos.x.toString(),
        y: (screenTextPos.y + verticalOffset).toString(),
        fill: colorMap.schematic.label_local,
        "font-family": "sans-serif",
        "text-anchor": ninePointAnchorToTextAnchor[text.anchor],
        "dominant-baseline": dominantBaseline,
        "font-size": `${getSchScreenFontSize(realToScreenTransform, "reference_designator")}px`,
      },
      value: "",
      children: [
        {
          type: "text",
          value: textValue,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  }

  // Draw Boxes

  for (const box of boxes) {
    const screenBoxPos = applyToPoint(
      compose(realToScreenTransform, transformFromSymbolToReal),
      box,
    )
    const symbolToScreenScale = compose(
      realToScreenTransform,
      transformFromSymbolToReal,
    ).a

    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: screenBoxPos.x.toString(),
        y: screenBoxPos.y.toString(),
        width: (box.width * symbolToScreenScale).toString(),
        height: (box.height * symbolToScreenScale).toString(),
        fill: "red",
      },
      value: "",
      children: [],
    })
  }

  // Draw Ports for debugging
  for (const port of symbol.ports) {
    const screenPortPos = applyToPoint(
      compose(realToScreenTransform, transformFromSymbolToReal),
      port,
    )
    svgObjects.push({
      type: "element",
      name: "circle",
      attributes: {
        cx: screenPortPos.x.toString(),
        cy: screenPortPos.y.toString(),
        r: `${Math.abs(realToScreenTransform.a) * 0.02}px`,
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        fill: "none",
        stroke: colorMap.schematic.component_outline,
      },
      value: "",
      children: [],
    })
  }
  return svgObjects
}
