import { expect, test } from "bun:test"
import type { SchematicGraphic } from "circuit-json"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"

test("validates schematic graphic source URLs and reports unusable sources", () => {
  const render = (schematicGraphic: SchematicGraphic) =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic,
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    })

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "missing",
    }),
  ).toThrow(
    'Unable to render schematic graphic "missing": asset or svg_content is required',
  )

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "png",
      asset: {
        project_relative_path: "inline",
        url: "data:image/png;base64,iVBORw0KGgo=",
        mimetype: "image/png",
      },
    }),
  ).toThrow('asset.mimetype must be "image/svg+xml"')

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "mismatched-data-url",
      asset: {
        project_relative_path: "inline",
        url: "data:text/plain,%3Csvg%2F%3E",
        mimetype: "image/svg+xml",
      },
    }),
  ).toThrow('asset.url must use the "image/svg+xml" media type')

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "invalid-base64",
      asset: {
        project_relative_path: "inline",
        url: "data:image/svg+xml;base64,not-valid!",
        mimetype: "image/svg+xml",
      },
    }),
  ).toThrow("asset.url is not a valid SVG data URL")

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "invalid-percent-encoding",
      asset: {
        project_relative_path: "inline",
        url: "data:image/svg+xml;charset=utf-8,%ZZ",
        mimetype: "image/svg+xml",
      },
    }),
  ).toThrow("asset.url is not a valid SVG data URL")

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "charset-percent-encoding",
      asset: {
        project_relative_path: "inline",
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`,
        mimetype: "image/svg+xml",
      },
    }),
  ).not.toThrow()

  expect(() =>
    render({
      type: "schematic_graphic",
      schematic_graphic_id: "remote",
      asset: {
        project_relative_path: "assets/system.svg",
        url: "https://example.com/system.svg",
        mimetype: "image/svg+xml",
      },
    }),
  ).toThrow("asset.url must be an inline SVG data URL")
})
