import { expect, test } from "bun:test"
import type { SchematicComponent } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { createSvgObjectsFromSchematicComponentWithBox } from "lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-box"

const transform = { a: 10, b: 0, c: 0, d: -10, e: 100, f: 100 }

function getBodyAndOverlay(width: number, height: number) {
  const component: SchematicComponent = {
    type: "schematic_component",
    schematic_component_id: "component",
    source_component_id: "source",
    center: { x: 3, y: -2 },
    size: { width, height },
    is_box_with_pins: true,
  }
  const objects = createSvgObjectsFromSchematicComponentWithBox({
    component,
    transform,
    circuitJson: [component],
    colorMap,
  })
  const body = objects.find((object) =>
    object.attributes.class?.includes("sch-component-body"),
  )
  const overlay = objects.find((object) =>
    object.attributes.class?.includes("sch-component-overlay"),
  )
  expect(body?.name).toBe("rect")
  expect(overlay?.name).toBe("rect")
  if (!body || !overlay) throw new Error("Component body or overlay missing")
  return [body.attributes, overlay.attributes]
}

test("valid positive and zero component dimensions stay unchanged", () => {
  for (const attributes of getBodyAndOverlay(4, 2)) {
    expect(attributes).toMatchObject({
      x: "110",
      y: "110",
      width: "40",
      height: "20",
    })
  }
  for (const attributes of getBodyAndOverlay(0, 0)) {
    expect(attributes).toMatchObject({
      x: "130",
      y: "120",
      width: "0",
      height: "0",
    })
  }
})

test("negative component width clamps to zero at the component center", () => {
  for (const attributes of getBodyAndOverlay(-4, 2)) {
    expect(attributes).toMatchObject({
      x: "130",
      y: "110",
      width: "0",
      height: "20",
    })
  }
})

test("negative component height clamps to zero at the component center", () => {
  for (const attributes of getBodyAndOverlay(4, -2)) {
    expect(attributes).toMatchObject({
      x: "110",
      y: "120",
      width: "40",
      height: "0",
    })
  }
})

test("both negative component dimensions clamp without dropping the rectangles", () => {
  for (const attributes of getBodyAndOverlay(-4, -2)) {
    expect(attributes).toMatchObject({
      x: "130",
      y: "120",
      width: "0",
      height: "0",
    })
  }
})
