import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"

test("requires base64 to be the final SVG data URL metadata token", () => {
  const payload = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
  ).toString("base64")
  const render = (url: string) =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_base64_metadata",
        asset: {
          project_relative_path: "inline",
          mimetype: "image/svg+xml",
          url,
        },
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    })

  expect(() =>
    render(`data:image/svg+xml;base64;charset=utf-8,${payload}`),
  ).toThrow('asset.url must place "base64" as its final metadata token')
  expect(() => render(`data:image/svg+xml;base64;,${payload}`)).toThrow(
    'asset.url must place "base64" as its final metadata token',
  )
  expect(() =>
    render(`data:image/svg+xml;charset=utf-8;BASE64,${payload}`),
  ).not.toThrow()
})
