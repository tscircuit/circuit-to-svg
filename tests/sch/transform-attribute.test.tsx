import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("svg should have data-real-to-screen-transform attribute", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_box",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      schematic_component_id: "1",
    },
  ])

  // Check that the SVG contains the data-real-to-screen-transform attribute
  expect(svg).toContain('data-real-to-screen-transform="')

  // Extract the transform value and verify it's a valid matrix string
  const match = svg.match(/data-real-to-screen-transform="([^"]+)"/)

  // @ts-ignore
  expect(match[1]).toMatchInlineSnapshot(`"matrix(54.5454545455,0,0,-54.5454545455,600,300)"`)
})
