import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { getSchMmFontSize } from "lib/utils/get-sch-font-size"
import { matchSchPortsToSymbolPorts } from "lib/utils/match-sch-ports-with-symbol-ports"
import { pointPairsToMatrix } from "lib/utils/point-pairs-to-matrix"
import { type SchSymbol, type TextPrimitive, symbols } from "schematic-symbols"
import { applyToPoint } from "transformation-matrix"
import { estimateTextWidth } from "./estimate-text-width"

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type SourceComponent = Extract<AnyCircuitElement, { type: "source_component" }>

export function getSchematicSymbolTextBounds(
  circuitJson: AnyCircuitElement[],
): Bounds | null {
  const components: SchematicComponent[] = []
  const schematicPortsByComponentId = new Map<string, SchematicPort[]>()
  const sourceComponentsById = new Map<string, SourceComponent>()
  let combinedBounds: Bounds | null = null

  for (const element of circuitJson) {
    if (element.type === "schematic_component") {
      components.push(element)
    } else if (
      element.type === "schematic_port" &&
      element.schematic_component_id
    ) {
      const componentPorts =
        schematicPortsByComponentId.get(element.schematic_component_id) ?? []
      componentPorts.push(element)
      schematicPortsByComponentId.set(
        element.schematic_component_id,
        componentPorts,
      )
    } else if (element.type === "source_component") {
      sourceComponentsById.set(element.source_component_id, element)
    }
  }

  for (const component of components) {
    const componentBounds = getComponentSymbolTextBounds({
      component,
      schematicPorts:
        schematicPortsByComponentId.get(component.schematic_component_id) ?? [],
      sourceComponent: component.source_component_id
        ? sourceComponentsById.get(component.source_component_id)
        : undefined,
    })
    if (!componentBounds) continue

    combinedBounds = combinedBounds
      ? combineBounds(combinedBounds, componentBounds)
      : componentBounds
  }

  return combinedBounds
}

function getComponentSymbolTextBounds({
  component,
  schematicPorts,
  sourceComponent,
}: {
  component: SchematicComponent
  schematicPorts: SchematicPort[]
  sourceComponent: SourceComponent | undefined
}): Bounds | null {
  if (!component.symbol_name) return null

  const symbol = (symbols as Record<string, SchSymbol | undefined>)[
    component.symbol_name
  ]
  if (!symbol) return null

  const matchedPorts = matchSchPortsToSymbolPorts({
    schPorts: schematicPorts,
    symbol,
    schComponent: component,
  })
  if (!matchedPorts[0]) return null

  const symbolToRealTransform = pointPairsToMatrix(
    matchedPorts[1]?.symbolPort ?? symbol.center,
    matchedPorts[1]?.schPort.center ?? component.center,
    matchedPorts[0].symbolPort,
    matchedPorts[0].schPort.center,
  )
  let combinedBounds: Bounds | null = null

  for (const primitive of symbol.primitives) {
    if (primitive.type !== "text") continue

    const text = getRenderedText({
      primitive,
      component,
      sourceComponent,
    })
    if (!text) continue

    const anchorPosition = applyToPoint(symbolToRealTransform, primitive)
    const fontSize = getSchMmFontSize("reference_designator")
    const textBounds = getTextBoundsFromAnchor({
      x: anchorPosition.x,
      y: anchorPosition.y,
      width: estimateTextWidth(text) * fontSize,
      height: fontSize,
      anchor: primitive.anchor,
    })
    combinedBounds = combinedBounds
      ? combineBounds(combinedBounds, textBounds)
      : textBounds
  }

  return combinedBounds
}

function getRenderedText({
  primitive,
  component,
  sourceComponent,
}: {
  primitive: TextPrimitive
  component: SchematicComponent
  sourceComponent: SourceComponent | undefined
}): string {
  if (primitive.text === "{REF}") {
    return sourceComponent?.display_name ?? sourceComponent?.name ?? ""
  }
  if (primitive.text === "{VAL}") {
    return component.symbol_display_value ?? ""
  }
  return ""
}

function getTextBoundsFromAnchor({
  x,
  y,
  width,
  height,
  anchor,
}: {
  x: number
  y: number
  width: number
  height: number
  anchor: TextPrimitive["anchor"]
}): Bounds {
  let minX = x
  let maxX = x
  let minY = y - height / 2
  let maxY = y + height / 2

  if (anchor.includes("left")) {
    maxX = x + width
  } else if (anchor.includes("right")) {
    minX = x - width
  } else {
    minX = x - width / 2
    maxX = x + width / 2
  }

  if (anchor.includes("top")) {
    minY = y - height
    maxY = y
  } else if (anchor.includes("bottom")) {
    minY = y
    maxY = y + height
  }

  return { minX, minY, maxX, maxY }
}

function combineBounds(first: Bounds, second: Bounds): Bounds {
  return {
    minX: Math.min(first.minX, second.minX),
    minY: Math.min(first.minY, second.minY),
    maxX: Math.max(first.maxX, second.maxX),
    maxY: Math.max(first.maxY, second.maxY),
  }
}
