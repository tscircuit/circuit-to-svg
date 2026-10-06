import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("preserves the schematic text id on the rendered search target", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_text",
      schematic_text_id: "inline_usb_dm",
      text: "USB0_DM",
      position: { x: 0, y: 0 },
      anchor: "left",
      rotation: 0,
      color: "black",
      font_size: 0.18,
    },
  ])

  expect(svg).toContain('data-schematic-text-id="inline_usb_dm"')
})
