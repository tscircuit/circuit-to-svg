import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createSvgObjectsForSchPortPinLabel } from "lib/sch/svg-object-fns/create-svg-objects-for-sch-port-pin-label"
import type { Matrix } from "transformation-matrix"

const transform: Matrix = { a: 100, b: 0, c: 0, d: -100, e: 0, f: 0 }

const schComponent: SchematicComponent = {
  type: "schematic_component",
  schematic_component_id: "schematic_component_1",
  center: { x: 0, y: 0 },
  size: { width: 2, height: 2 },
  is_box_with_pins: true,
}

const renderPinLabel = (overrides: Partial<SchematicPort> = {}) => {
  const schPort: SchematicPort = {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    source_port_id: "source_port_1",
    schematic_component_id: schComponent.schematic_component_id,
    center: { x: -1.2, y: 0 },
    side_of_component: "left",
    display_pin_label: "ENABLE",
    ...overrides,
  }

  const label = createSvgObjectsForSchPortPinLabel({
    schPort,
    schComponent,
    transform,
    circuitJson: [],
  })[0]

  if (!label) throw new Error("Expected a schematic pin label")
  return label
}

test("schematic port pin labels use an optional font-size override", () => {
  expect(renderPinLabel().attributes["font-size"]).toBe("15px")
  expect(
    renderPinLabel({ display_pin_label_font_size: 0.1 }).attributes[
      "font-size"
    ],
  ).toBe("10px")
})

test("font-size overrides apply to negated and inverted pin labels", () => {
  expect(
    renderPinLabel({ display_pin_label: "N_ENABLE" }).attributes["font-size"],
  ).toBe("12px")
  expect(
    renderPinLabel({
      display_pin_label: "N_ENABLE",
      display_pin_label_font_size: 0.09,
    }).attributes["font-size"],
  ).toBe("9px")
  expect(
    renderPinLabel({
      is_drawn_with_inversion_circle: true,
      display_pin_label_font_size: 0.08,
    }).attributes["font-size"],
  ).toBe("8px")
})

test("font-size overrides do not change vertical label rotation", () => {
  const label = renderPinLabel({
    center: { x: 0, y: 1.2 },
    side_of_component: "top",
    display_pin_label_font_size: 0.1,
  })

  expect(label.attributes["font-size"]).toBe("10px")
  expect(label.attributes.transform).toStartWith("rotate(-90 ")
})

test("schematic pin-label font-size overrides", () => {
  const makeComparisonComponent = ({
    id,
    x,
    fontSize,
    title,
  }: {
    id: string
    x: number
    fontSize?: number
    title: string
  }): AnyCircuitElement[] => {
    const schematicComponentId = `schematic_component_${id}`

    return [
      {
        type: "schematic_component",
        schematic_component_id: schematicComponentId,
        center: { x, y: 0 },
        size: { width: 2.6, height: 2.2 },
        is_box_with_pins: true,
      },
      ...[
        { id: "input", y: 0.45, label: "LONG_INPUT_LABEL" },
        { id: "active_low", y: 0, label: "N_ACTIVE_LOW" },
        { id: "output", y: -0.45, label: "OUTPUT_LABEL" },
      ].map(({ id: portId, y, label }) => ({
        type: "schematic_port" as const,
        schematic_port_id: `schematic_port_${id}_${portId}`,
        source_port_id: `source_port_${id}_${portId}`,
        schematic_component_id: schematicComponentId,
        center: { x: x - 1.7, y },
        side_of_component: "left" as const,
        distance_from_component_edge: 0.4,
        display_pin_label: label,
        display_pin_label_font_size: fontSize,
      })),
      {
        type: "schematic_port",
        schematic_port_id: `schematic_port_${id}_vertical`,
        source_port_id: `source_port_${id}_vertical`,
        schematic_component_id: schematicComponentId,
        center: { x: x + 0.65, y: 1.5 },
        side_of_component: "top",
        distance_from_component_edge: 0.4,
        display_pin_label: "VERTICAL_LABEL",
        display_pin_label_font_size: fontSize,
      },
      {
        type: "schematic_text",
        schematic_text_id: `schematic_text_${id}`,
        text: title,
        font_size: 0.18,
        position: { x, y: -1.45 },
        rotation: 0,
        anchor: "center",
        color: "#006464",
      },
    ]
  }

  const circuitJson: AnyCircuitElement[] = [
    ...makeComparisonComponent({
      id: "default",
      x: -2.3,
      title: "DEFAULT 0.15mm",
    }),
    ...makeComparisonComponent({
      id: "override",
      x: 2.3,
      fontSize: 0.12,
      title: "OVERRIDE 0.12mm",
    }),
  ]

  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
