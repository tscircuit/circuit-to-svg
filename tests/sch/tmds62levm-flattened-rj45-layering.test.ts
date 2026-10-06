import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

const sourceCircuitJson = JSON.parse(
  readFileSync(
    new URL("../fixtures/tmds62levm-sheet-32-rj45.json", import.meta.url),
    "utf8",
  ),
) as AnyCircuitElement[]

const componentBodyId = "schematic_rect_altium_4205"
const firstTerminalId = "schematic_circle_altium_3834"

type FlattenedSchematicElement = Extract<
  AnyCircuitElement,
  {
    type:
      | "schematic_line"
      | "schematic_circle"
      | "schematic_rect"
      | "schematic_arc"
      | "schematic_path"
      | "schematic_text"
  }
>

const isFlattenedSchematicElement = (
  element: AnyCircuitElement,
): element is FlattenedSchematicElement =>
  element.type === "schematic_line" ||
  element.type === "schematic_circle" ||
  element.type === "schematic_rect" ||
  element.type === "schematic_arc" ||
  element.type === "schematic_path" ||
  element.type === "schematic_text"

const flattenedCircuitJson = sourceCircuitJson
  .filter(
    (element) =>
      element.type !== "schematic_component" &&
      element.type !== "schematic_port",
  )
  .map((element) => {
    if (!isFlattenedSchematicElement(element)) return element
    return { ...element, schematic_component_id: undefined }
  })

const componentBody = flattenedCircuitJson.find(
  (element) =>
    element.type === "schematic_rect" &&
    element.schematic_rect_id === componentBodyId,
)

if (!componentBody) throw new Error("TMDS62LEVM RJ45 body is missing")

const bodyFirstCircuitJson = [
  componentBody,
  ...flattenedCircuitJson.filter((element) => element !== componentBody),
]

test("TMDS62LEVM flattened RJ45 preserves primitive order", () => {
  const svg = convertCircuitJsonToSchematicSvg(bodyFirstCircuitJson)
  const bodyIndex = svg.indexOf(`data-schematic-rect-id="${componentBodyId}"`)
  const terminalIndex = svg.indexOf(
    `data-schematic-circle-id="${firstTerminalId}"`,
  )

  expect(bodyIndex).toBeGreaterThan(terminalIndex)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
