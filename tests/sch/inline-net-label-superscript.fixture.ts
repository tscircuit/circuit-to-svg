import type { AnyCircuitElement, SchematicTrace } from "circuit-json"
import type { SchematicTextWithSuperscript } from "lib/utils/net-label-superscript"

export const inlineNetLabelExamples: Array<
  AnyCircuitElement | SchematicTextWithSuperscript
> = []
let nextId = 0
function text(
  value: string,
  x: number,
  y: number,
  options: Partial<SchematicTextWithSuperscript> = {},
) {
  const label: SchematicTextWithSuperscript = {
    type: "schematic_text",
    schematic_text_id: `text_${nextId++}`,
    text: value,
    position: { x, y },
    font_size: 0.18,
    rotation: 0,
    anchor: "bottom_left",
    color: "#334155",
    ...options,
  }
  inlineNetLabelExamples.push(label)
}
function wire(id: string, x: number, y: number, vertical = false) {
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: id,
    source_trace_id: `source_${id}`,
    edges: [
      {
        from: { x, y },
        to: { x: x + (vertical ? 0 : 2.3), y: y + (vertical ? -1.3 : 0) },
      },
    ],
    junctions: [
      { x, y },
      { x: x + (vertical ? 0 : 2.3), y: y + (vertical ? -1.3 : 0) },
    ],
  }
  inlineNetLabelExamples.push(trace)
  return `source_${id}`
}
text("INLINE NET LABELS", 4.35, 1.1, {
  anchor: "bottom_center",
  font_size: 0.27,
  color: "#0f172a",
})
text("Display-only suffixes alongside separate wires", 4.35, 0.65, {
  anchor: "bottom_center",
  font_size: 0.16,
  color: "#64748b",
})
for (const [column, suffix] of [undefined, "1", "2"].entries()) {
  const x = column * 3.2
  text("GND", x + 0.12, 0.12, {
    display_superscript: suffix,
    source_trace_id: wire(`gnd_${column}`, x, 0),
  })
  text(column === 0 ? "No suffix" : `Ground net ${suffix}`, x, -0.48, {
    font_size: 0.14,
    color: "#64748b",
  })
}
for (const [column, [name, suffix]] of [
  ["SDA", "1"],
  ["SDA", "2"],
  ["RESET", "12"],
].entries()) {
  const x = column * 3.2
  text(name!, x + 2.18, -1.18, {
    display_superscript: suffix,
    anchor: "bottom_right",
    source_trace_id: wire(`signal_${column}`, x, -1.3),
  })
}
text("Rotated labels", 0, -2.3, { font_size: 0.16, color: "#64748b" })
for (const [column, rotation] of [-90, 90, -90].entries()) {
  const x = column * 3.2 + 1.15
  text(column === 2 ? "VCC" : "GND", x - 0.16, -3.3, {
    display_superscript: column === 2 ? "A" : `${column + 1}`,
    rotation,
    anchor: "center",
    source_trace_id: wire(`vertical_${column}`, x, -2.6, true),
  })
}
