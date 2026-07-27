import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

const chipWithSize = (width: number, height: number): AnyCircuitElement[] => [
  {
    type: "schematic_component",
    schematic_component_id: "sc0",
    center: { x: 0, y: 0 },
    size: { width, height },
    source_component_id: "src0",
  } as unknown as AnyCircuitElement,
  {
    type: "source_component",
    source_component_id: "src0",
    name: "U1",
    ftype: "simple_chip",
  } as unknown as AnyCircuitElement,
]

const bodyRect = (svg: string): string =>
  svg.match(/class="component chip sch-component-body"[^>]*/)?.[0] ?? ""

test("negative schematic component size does not emit a negative width", () => {
  const svg = convertCircuitJsonToSchematicSvg(chipWithSize(-4, 2))

  // A negative size.width flips the two corners, so the derived screen width
  // came out negative and the body rect was dropped by the renderer.
  expect(bodyRect(svg)).not.toMatch(/width="-[\d.]+"/)
  expect(bodyRect(svg)).toMatch(/width="0"/)
})

test("valid schematic component size still renders its width", () => {
  const svg = convertCircuitJsonToSchematicSvg(chipWithSize(4, 2))

  expect(bodyRect(svg)).not.toMatch(/width="(-[\d.]+|0)"/)
  expect(bodyRect(svg)).toMatch(/width="[\d.]+"/)
})
