import { expect, test } from "bun:test"
import type { SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic text includes its circuit json identity", () => {
  const circuitJson: SchematicText[] = [
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_inline_label",
      source_trace_id: "source_trace_signal",
      text: "SIGNAL",
      position: { x: 0, y: 0 },
      anchor: "center",
      rotation: 0,
      font_size: 0.2,
      color: "rgb(132, 0, 0)",
    },
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_note",
      text: "note",
      position: { x: 0, y: 1 },
      anchor: "center",
      rotation: 0,
      font_size: 0.2,
      color: "#006464",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).toContain(
    'class="sch-text" data-circuit-json-type="schematic_text" data-schematic-text-id="schematic_text_inline_label"',
  )
  expect(svg).toContain(
    'class="sch-text" data-circuit-json-type="schematic_text" data-schematic-text-id="schematic_text_note"',
  )
  expect(svg).not.toContain("data-source-trace-id")
})
