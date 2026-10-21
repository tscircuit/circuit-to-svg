import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicArc } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { createSvgObjectsFromSchematicArc } from "lib/sch/svg-object-fns/create-svg-objects-from-sch-arc"
import { colorMap } from "lib/utils/colors"
import { compose, scale, translate } from "transformation-matrix"

test("schematic arcs use the same coordinate frame as their endpoints", async () => {
  const circuitJson: AnyCircuitElement[] = []
  for (const [index, direction] of (
    ["counterclockwise", "clockwise"] as const
  ).entries()) {
    const arc: SchematicArc = {
      type: "schematic_arc",
      schematic_arc_id: `arc${index}`,
      center: { x: index * 4, y: 0 },
      radius: 1,
      start_angle_degrees: 0,
      end_angle_degrees: 90,
      direction,
      stroke_width: 0.04,
      color: "#840000",
      is_dashed: false,
    }
    circuitJson.push(arc, {
      type: "schematic_text",
      schematic_text_id: `label${index}`,
      text: `0 to 90 degrees, ${direction}`,
      position: { x: arc.center.x, y: -1.5 },
      anchor: "center",
      rotation: 0,
      font_size: 0.15,
      color: "teal",
    })
    for (const [label, point] of [
      ["0", { x: arc.center.x + 1, y: 0 }],
      ["90", { x: arc.center.x, y: 1 }],
    ] as const) {
      circuitJson.push({
        type: "schematic_circle",
        schematic_circle_id: `endpoint${index}_${label}`,
        center: point,
        radius: 0.06,
        stroke_width: 0.02,
        color: "teal",
        is_filled: false,
        is_dashed: false,
      })
    }

    const [path] = createSvgObjectsFromSchematicArc({
      schArc: arc,
      transform: compose(translate(40, 40), scale(10, -10)),
      colorMap,
    })
    // +Y in schematic space is up: the 90-degree endpoint must land above
    // the center on screen. Both directions share endpoints, not arc lengths.
    expect(path!.attributes.d).toBe(
      `M ${50 + index * 40} 40 A 10 10 0 ${index} ${index} ${40 + index * 40} 30`,
    )
  }
  await expect(
    convertCircuitJsonToSchematicSvg(circuitJson),
  ).toMatchSvgSnapshot(import.meta.path)
})
