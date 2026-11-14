import type { SchematicPort, SchematicText } from "circuit-json"

/** Label placement in schematic-world mm (+X right, +Y up), before SVG projection. */
export function getSchematicGroupPortLabel(port: SchematicPort): SchematicText {
  const direction = port.facing_direction ?? "left"
  return {
    type: "schematic_text",
    schematic_text_id: `${port.schematic_port_id}_label`,
    text: port.display_pin_label ?? "",
    font_size: port.display_pin_label_font_size ?? 0.18,
    rotation: 0,
    color: "inherit",
    anchor:
      direction === "left"
        ? "right"
        : direction === "right"
          ? "left"
          : "center",
    position: {
      x:
        port.center.x +
        (direction === "left" ? -0.15 : direction === "right" ? 0.15 : 0),
      y:
        port.center.y +
        (direction === "up" ? 0.22 : direction === "down" ? -0.22 : 0),
    },
  }
}
