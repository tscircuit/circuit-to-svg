import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"

test("reports unsupported and synchronously unavailable assets", () => {
  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_png",
        asset: {
          project_relative_path: "inline",
          url: "data:image/png;base64,iVBORw0KGgo=",
          mimetype: "image/png",
        },
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_png": asset.mimetype must be "image/svg+xml"',
  )

  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_mimetype_mismatch",
        asset: {
          project_relative_path: "inline",
          url: `data:text/plain,${encodeURIComponent("<svg />")}`,
          mimetype: "image/svg+xml",
        },
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_mimetype_mismatch": asset.url must use the "image/svg+xml" media type',
  )

  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_remote",
        asset: {
          project_relative_path: "assets/system.svg",
          url: "https://example.com/system.svg",
          mimetype: "image/svg+xml",
        },
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_remote": asset.url must be an inline SVG data URL because circuit-to-svg cannot synchronously load',
  )
})
