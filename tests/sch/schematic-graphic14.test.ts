import { expect, test } from "bun:test"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-schematic-graphic"

test("requires hashes in non-base64 SVG data payloads to be percent-encoded", () => {
  const svgContent =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#f00"/></svg>'
  const render = (url: string) =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_hash_encoding",
        asset: {
          project_relative_path: "inline",
          mimetype: "image/svg+xml",
          url,
        },
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    })

  expect(() => render(`data:image/svg+xml,${svgContent}`)).toThrow(
    'asset.url must percent-encode "#" in a non-base64 SVG data URL',
  )
  expect(() =>
    render(`data:image/svg+xml,${encodeURIComponent(svgContent)}`),
  ).not.toThrow()
})
