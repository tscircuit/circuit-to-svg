import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-symbol"
import { colorMap } from "lib/utils/colors"
import { type SchSymbol, symbols } from "schematic-symbols"
import { scale } from "transformation-matrix"

test("symbol circles resize with the rest of the symbol", async () => {
  const circuitJson: AnyCircuitElement[] = []
  for (const [row, symbolName] of [
    "dc_ammeter_right",
    "dc_ammeter_up",
  ].entries()) {
    const symbol = (symbols as Record<string, SchSymbol | undefined>)[
      symbolName
    ]!
    for (const [column, factor] of [0.5, 1, 2].entries()) {
      const id = `${row}_${column}`
      const center = { x: column * 3, y: -row * 3 }
      const component: SchematicComponent = {
        type: "schematic_component",
        schematic_component_id: `sc${id}`,
        source_component_id: `c${id}`,
        symbol_name: symbolName,
        center,
        size: {
          width: factor * symbol.size.width,
          height: factor * symbol.size.height,
        },
        is_box_with_pins: true,
      }
      const ports: SchematicPort[] = symbol.ports.map((port, index) => ({
        type: "schematic_port",
        schematic_port_id: `sp${id}_${index}`,
        schematic_component_id: component.schematic_component_id,
        source_port_id: `p${id}_${index}`,
        center: {
          x: center.x + factor * (port.x - symbol.center.x),
          y: center.y + factor * (port.y - symbol.center.y),
        },
      }))
      circuitJson.push({
        type: "source_component",
        source_component_id: `c${id}`,
        ftype: "simple_chip",
        name: `M${row * 3 + column + 1}`,
      })
      for (const [index, port] of ports.entries()) {
        circuitJson.push({
          type: "source_port",
          source_port_id: port.source_port_id,
          source_component_id: `c${id}`,
          name: `pin${index + 1}`,
          pin_number: index + 1,
        })
      }
      circuitJson.push(component, ...ports, {
        type: "schematic_text",
        schematic_text_id: `label${id}`,
        text: `${factor}x`,
        position: { x: center.x, y: center.y - 1.3 },
        anchor: "center",
        rotation: 0,
        font_size: 0.18,
        color: "teal",
      })

      const rendered = createSvgObjectsFromSchematicComponentWithSymbol({
        component,
        transform: scale(10, -10),
        circuitJson,
        colorMap,
      })
      const circle = rendered.find(
        (element) => element.attributes.class === "sch-component-symbol-circle",
      )!
      // Both meter variants have a 0.29 mm body radius at their native size.
      expect(Number.parseFloat(circle.attributes.r!)).toBeCloseTo(
        2.9 * factor,
        8,
      )
    }
  }
  await expect(
    convertCircuitJsonToSchematicSvg(circuitJson),
  ).toMatchSvgSnapshot(import.meta.path)
})
