import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib"

const createCircuitJson = (): AnyCircuitElement[] => [
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "header-hole",
    shape: "circle",
    x: 1,
    y: 0,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 6,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
]

test("assembly rendering preserves caller element order and objects", () => {
  const circuitJson = createCircuitJson()
  const originalElements = [...circuitJson]
  const originalJson = structuredClone(circuitJson)
  const originalKeys = Reflect.ownKeys(circuitJson)
  convertCircuitJsonToAssemblySvg(circuitJson)
  expect(circuitJson).toEqual(originalJson)
  expect(Reflect.ownKeys(circuitJson)).toEqual(originalKeys)
  for (const [index, original] of originalElements.entries()) {
    expect(circuitJson[index]).toBe(original)
  }
})

test("assembly renders a frozen caller array", () => {
  const circuitJson = createCircuitJson()
  Object.freeze(circuitJson)
  const svg = convertCircuitJsonToAssemblySvg(circuitJson, {
    showErrorsInTextOverlay: true,
  })
  expect(svg).toContain("assembly-hole-inner")
})

test("preserves the assembly drawing order", () => {
  expect(
    convertCircuitJsonToAssemblySvg(createCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path, "assembly-input-order")
})
