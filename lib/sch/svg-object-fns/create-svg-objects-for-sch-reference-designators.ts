import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { matchSchPortsToSymbolPorts } from "lib/utils/match-sch-ports-with-symbol-ports"
import { pointPairsToMatrix } from "lib/utils/point-pairs-to-matrix"
import { type SchSymbol, getSvg, symbols } from "schematic-symbols"
import type { TextPrimitive } from "schematic-symbols"
import {
  type Matrix,
  applyToPoint,
  compose,
  translate,
} from "transformation-matrix"
import type { SvgObject } from "../../../lib/svg-object"
import type { ColorMap } from "../../../lib/utils/colors"
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

export const createSvgObjectsForSchReferenceDesignators = ({
  circuitJson,
  transform: realToScreenTransform,
  colorMap,
}: {
  circuitJson: AnyCircuitElement[]
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  // Get all schematic components
  const schComponents = su(circuitJson as any).schematic_component.list()

  for (const schComponent of schComponents) {
    if (!schComponent.symbol_name) continue

    const symbol: SchSymbol = (symbols as any)[schComponent.symbol_name]
    if (!symbol) continue

    const schPorts = su(circuitJson as any).schematic_port.list({
      schematic_component_id: schComponent.schematic_component_id,
    }) as SchematicPort[]

    const srcComponent = su(circuitJson as any).source_component.get(
      schComponent.source_component_id,
    )

    // Match schPorts to symbol ports
    const schPortsWithSymbolPorts = matchSchPortsToSymbolPorts({
      schPorts,
      symbol,
      schComponent,
    })

    if (!schPortsWithSymbolPorts[0]) continue

    const transformFromSymbolToReal = pointPairsToMatrix(
      schPortsWithSymbolPorts[1]?.symbolPort ?? symbol.center,
      schPortsWithSymbolPorts[1]?.schPort.center ?? schComponent.center,
      schPortsWithSymbolPorts[0].symbolPort,
      schPortsWithSymbolPorts[0].schPort.center,
    )

    // Find text primitives with {REF} placeholder
    const refTexts = symbol.primitives.filter(
      (p) => p.type === "text" && (p as any).text === "{REF}",
    ) as TextPrimitive[]

    const paths = symbol.primitives.filter((p) => p.type === "path")
    const bounds = {
      minX: Math.min(
        ...paths.flatMap((p) =>
          (p as any).points.map((pt: any) =>
            Array.isArray(pt) ? pt[0] : pt.x,
          ),
        ),
      ),
      maxX: Math.max(
        ...paths.flatMap((p) =>
          (p as any).points.map((pt: any) =>
            Array.isArray(pt) ? pt[0] : pt.x,
          ),
        ),
      ),
      minY: Math.min(
        ...paths.flatMap((p) =>
          (p as any).points.map((pt: any) =>
            Array.isArray(pt) ? pt[1] : pt.y,
          ),
        ),
      ),
      maxY: Math.max(
        ...paths.flatMap((p) =>
          (p as any).points.map((pt: any) =>
            Array.isArray(pt) ? pt[1] : pt.y,
          ),
        ),
      ),
    }

    for (const text of refTexts) {
      const textPoint = Array.isArray(text)
        ? { x: text[0], y: text[1] }
        : { x: text.x, y: text.y }
      const screenTextPos = applyToPoint(
        compose(realToScreenTransform, transformFromSymbolToReal),
        textPoint,
      )

      const textValue = srcComponent?.name ?? ""
      if (!textValue) continue

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
          fill: colorMap.schematic.reference,
          stroke: colorMap.schematic.background,
          "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
          "paint-order": "stroke",
          "font-family": "sans-serif",
          "text-anchor": ninePointAnchorToTextAnchor[text.anchor],
          "dominant-baseline": dominantBaseline,
          "font-size": `${getSchScreenFontSize(realToScreenTransform, "reference_designator")}px`,
          class: "component-name",
          "data-schematic-component-id": schComponent.schematic_component_id,
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
  }

  return svgObjects
}
