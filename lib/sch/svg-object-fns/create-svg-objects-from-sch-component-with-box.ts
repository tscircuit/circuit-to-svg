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
      class: "component-overlay",
      x: componentScreenTopLeft.x.toString(),
      y: componentScreenTopLeft.y.toString(),
      width: componentScreenWidth.toString(),
      height: componentScreenHeight.toString(),
      fill: "transparent",
    },
    children: [],
  })

  // Render display_name if present
  const srcComponent = su(circuitJson).source_component.get(
    schComponent.source_component_id!,
  )
  const displayName = srcComponent?.display_name

  if (displayName) {
    const schTexts = su(circuitJson).schematic_text.list()
    // Try to find the component name in schematic texts
    const nameText = schTexts.find(
      (t) =>
        t.schematic_component_id === schComponent.schematic_component_id &&
        t.text === srcComponent?.name,
    )

    let displayNameCenter = schComponent.center

    // If name text is found, position above it
    if (nameText) {
      // Assuming text is somewhat centered or aligned. We shift Y up in real coords
      // In schematic coords (usually mm), Y+ is UP? No, normally Y+ is UP in math but circuit-json Y axis...
      // Usually in circuit-json, +Y is UP?
      // Wait, let's verify schematic coordinate system.
      // In web, +Y is DOWN. In many CADs, +Y is UP.
      // If I don't know, I can check transform.
      // transform matrix: usually a flipY is involved if Y is UP.
      // But simpler: just offset it in screen space? NO, I am calculating real coords here if I use text.x/y
      // Actually `nameText` has `x, y` in real coords.

      // Let's use Screen Coords directly to avoid confusion.
      const nameScreenPos = applyToPoint(transform, {
        x: nameText.position.x,
        y: nameText.position.y,
      })

      // Shift UP in screen space (Subtract Y)
      const fontSize = getSchScreenFontSize(transform, "reference_designator")
      displayNameCenter = {
        x: 0, // Placeholder, calculated below
        y: 0,
      }
      // We will construct the SVG object directly with adjusted screen coords

      const screenX = nameScreenPos.x
      const screenY = nameScreenPos.y - fontSize * 1.2

      svgObjects.push({
        name: "text",
        type: "element",
        attributes: {
          x: screenX.toString(),
          y: screenY.toString(),
          fill: colorMap.schematic.label_local,
          "font-family": "sans-serif",
          "text-anchor": "middle", // Assumption: box text is usually middle?
          "dominant-baseline": "middle",
          "font-size": `${fontSize}px`,
        },
        children: [
          {
            type: "text",
            value: displayName,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    } else {
      // Fallback to center if name text not found
      const componentScreenCenter = applyToPoint(transform, schComponent.center)
      svgObjects.push({
        name: "text",
        type: "element",
        attributes: {
          x: componentScreenCenter.x.toString(),
          y: componentScreenCenter.y.toString(),
          fill: colorMap.schematic.label_local,
          "font-family": "sans-serif",
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
        },
        children: [
          {
            type: "text",
            value: displayName,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      })
    }
  }

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
