import { expect, test } from "bun:test"
import type { SchematicComponent, SchematicPort } from "circuit-json"
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
