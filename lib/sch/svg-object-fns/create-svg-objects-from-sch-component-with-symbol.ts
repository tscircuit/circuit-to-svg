import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
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
import { isSourcePortConnected } from "lib/utils/is-source-port-connected"

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
  "hanging" | "ideographic" | "middle"
> = {
  top_left: "hanging",
  top_right: "hanging",
  bottom_left: "ideographic",
  bottom_right: "ideographic",
  center: "middle",
  middle_left: "middle",
  middle_right: "middle",
  middle_top: "hanging",
  middle_bottom: "ideographic",
}

const DEFAULT_TEXT_OFFSET_FACTOR = 0.2
const REFERENCE_TEXT_OFFSET_FACTOR = 0.12
const REFERENCE_FONT_OFFSET_MULTIPLIER = 0.3
const VALUE_BOTTOM_OFFSET_MULTIPLIER = 0.6

export const createSvgObjectsFromSchematicComponentWithSymbol = ({
  component: schComponent,
  transform: realToScreenTransform,
  circuitJson,
  colorMap,
}: {
  component: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
  colorMap: ColorMap
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
    schComponent.source_component_id!,
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

  const connectedSymbolPorts = new Set<SchSymbol["ports"][number]>()
  for (const match of schPortsWithSymbolPorts) {
    if (isSourcePortConnected(circuitJson, match.schPort.source_port_id)) {
      connectedSymbolPorts.add(match.symbolPort)
    }
  }

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
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
  }

  const symbolToScreenScale = Math.abs(
    compose(realToScreenTransform, transformFromSymbolToReal).a,
  )

  for (const text of texts) {
    const screenTextPos = applyToPoint(
      compose(realToScreenTransform, transformFromSymbolToReal),
      text,
    )

    let textValue = ""
    const isReferenceText = text.text === "{REF}"
    const isValueText = text.text === "{VAL}"

    if (isReferenceText) {
      textValue = srcComponent?.display_name ?? srcComponent?.name ?? ""
    } else if (isValueText) {
      textValue = schComponent.symbol_display_value ?? ""
    }

    const symbolHeight = Math.abs(bounds.maxY - bounds.minY)
    const symbolWidth = Math.abs(bounds.maxX - bounds.minX)
    const offsetFactor = isReferenceText
      ? REFERENCE_TEXT_OFFSET_FACTOR
      : DEFAULT_TEXT_OFFSET_FACTOR
    const baseOffsetPx = symbolHeight * offsetFactor * symbolToScreenScale
    const fontSizePx = getSchScreenFontSize(
      realToScreenTransform,
      "reference_designator",
    )

    const textY = "y" in text && typeof text.y === "number" ? text.y : 0
    const textX = "x" in text && typeof text.x === "number" ? text.x : 0
    const topThreshold = bounds.minY + symbolHeight * 0.05
    const bottomThreshold = bounds.maxY - symbolHeight * 0.05
    let treatAsTop = text.anchor.includes("top") || textY <= topThreshold
    let treatAsBottom =
      text.anchor.includes("bottom") || textY >= bottomThreshold

    if (isReferenceText) {
      treatAsTop = true
      treatAsBottom = false
    } else if (isValueText) {
      treatAsBottom = true
      treatAsTop = false
    }

    let verticalOffset = 0

    if (treatAsBottom && !treatAsTop) {
      verticalOffset =
        baseOffsetPx * (isValueText ? VALUE_BOTTOM_OFFSET_MULTIPLIER : 1)
    } else if (treatAsTop && !treatAsBottom) {
      verticalOffset = -baseOffsetPx
      if (isReferenceText) {
        verticalOffset -= fontSizePx * REFERENCE_FONT_OFFSET_MULTIPLIER
      }
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
        ...(isReferenceText
          ? {
              stroke: colorMap.schematic.background,
              "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
              "paint-order": "stroke",
            }
          : {}),
        fill: colorMap.schematic.label_local,
        "font-family": "sans-serif",
        "text-anchor": ninePointAnchorToTextAnchor[text.anchor],
        "dominant-baseline": dominantBaseline,
        "font-size": `${fontSizePx}px`,
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
    if (connectedSymbolPorts.has(port)) continue
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

  for (const circle of circles) {
    const screenCirclePos = applyToPoint(
      compose(realToScreenTransform, transformFromSymbolToReal),
      circle,
    )
    const screenRadius = Math.abs(circle.radius * realToScreenTransform.a)
    svgObjects.push({
      type: "element",
      name: "circle",
      attributes: {
        cx: screenCirclePos.x.toString(),
        cy: screenCirclePos.y.toString(),
        r: `${screenRadius}px`,
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
