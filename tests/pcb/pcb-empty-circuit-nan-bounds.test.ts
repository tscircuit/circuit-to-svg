import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { any_circuit_element } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// Regression: when a circuit has no elements that contribute PCB bounds,
// getComprehensivePcbBounds returns +/-Infinity with hasBounds:false. The
// converter ignored that flag and fed the infinities into its scale/translate
// transform, so every projected coordinate became NaN and the emitted SVG
// contained `<rect class="pcb-boundary" x="NaN" y="NaN" width="NaN"
// height="NaN" ...>`, which is not valid SVG. This happens on two valid inputs:
//   1. an empty circuit `[]`
//   2. a circuit that only has source/schematic elements (a schematic-only
//      design or circuit JSON captured before PCB layout)
// The schematic converter already falls back to a finite default box for the
// empty case; the PCB converter now does the same.

// A schematic-only circuit: valid circuit-json, but nothing on the PCB.
const schematicOnly: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "sc1",
    name: "R1",
    ftype: "simple_resistor",
    resistance: 1000,
  },
  {
    type: "schematic_component",
    schematic_component_id: "sch1",
    source_component_id: "sc1",
    center: { x: 0, y: 0 },
    size: { width: 1, height: 0.4 },
    rotation: 0,
  },
] as AnyCircuitElement[]

test("empty and schematic-only inputs are valid circuit-json with no PCB bounds", () => {
  // Prove the inputs are schema-valid so the NaN is the renderer's fault.
  for (const element of schematicOnly) {
    expect(() => any_circuit_element.parse(element)).not.toThrow()
  }
  expect(getComprehensivePcbBounds([]).hasBounds).toBe(false)
  expect(getComprehensivePcbBounds(schematicOnly).hasBounds).toBe(false)
})

test("convertCircuitJsonToPcbSvg([]) does not emit NaN coordinates", () => {
  const svg = convertCircuitJsonToPcbSvg([])
  expect(svg).not.toContain("NaN")
  expect(svg).not.toContain("Infinity")
  expect(svg).toContain("<svg")
})

test("schematic-only circuit renders valid PCB SVG instead of NaN", () => {
  const svg = convertCircuitJsonToPcbSvg(schematicOnly)
  expect(svg).not.toContain("NaN")
  expect(svg).not.toContain("Infinity")

  // The boundary rect is where the NaN surfaced; confirm it is finite now.
  const boundary = svg.match(/<rect class="pcb-boundary"[^>]*>/)?.[0] ?? ""
  expect(boundary).not.toBe("")
  for (const attr of ["x", "y", "width", "height"] as const) {
    const value = boundary.match(new RegExp(`${attr}="([^"]*)"`))?.[1]
    expect(Number.isFinite(Number(value))).toBe(true)
  }

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
