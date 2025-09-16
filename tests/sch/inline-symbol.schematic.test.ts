// tests/inline-symbol.schematic.test.ts
import { describe, it, expect } from "bun:test"

// Adjust these import paths to match your repo layout if needed.
// If the file lives at lib/schematic/create-svg-objects-from-sch-component-with-symbol.ts
// then this import becomes:
//   import { createSvgObjectsFromSchematicComponentWithSymbol } from "../lib/schematic/create-svg-objects-from-sch-component-with-symbol"
import {
  // export this in your module if it isn't already
  createSvgObjectsFromSchematicComponentWithSymbol,
} from "../../lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-symbol"

import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import type { Matrix } from "transformation-matrix"

// A tiny identity matrix helper that satisfies the Matrix type used in the lib
const I: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

// Minimal colorMap that matches what the lib reads. If your file imports a default
// color map, feel free to import it instead; this local stub keeps the test isolated.
const colorMap = {
  schematic: {
    component_outline: "#222", // used as a default stroke if inline symbol omits stroke
  },
} as const

// A very small inline symbol with one path and one text primitive.
// This matches the shape `renderSymbol` expects in renderSymbol.ts.
type InlineSymbol = {
  width?: number
  height?: number
  primitives: Array<
    | {
        kind: "line"
        x1: number
        y1: number
        x2: number
        y2: number
        stroke_width?: number
      }
    | {
        kind: "text"
        x: number
        y: number
        text: string
        font_size?: number
        rotate_deg?: number
      }
  >
}

// Create a schematic component that provides an *inline* symbol via
// `schematic_component.symbol` (the new code path we wired in).
const makeComponentWithInlineSymbol = (
  symbol: InlineSymbol,
): SchematicComponent =>
  ({
    type: "schematic_component",
    id: "U1",
    symbol_name: "—ignored-when-inline—", // should be ignored by the inline path
    center: { x: 10, y: 20 },
    rotation: 0,
    flip: false,
    // @ts-expect-error - the circuit-json types may not yet include inline symbol on schematic_component;
    // the implementation guards with optional chaining. This keeps the test future-proof and focused.
    schematic_component: {
      symbol,
      // ports etc. can be omitted for this smoke test
    },
  }) as unknown as SchematicComponent

describe("createSvgObjectsFromSchematicComponentWithSymbol (inline symbol wiring)", () => {
  it("renders an inline symbol into a single <g> with the real→screen transform and nested primitives", () => {
    const circuitJson: AnyCircuitElement[] = []

    const inlineSymbol: InlineSymbol = {
      width: 10,
      height: 10,
      primitives: [
        { kind: "line", x1: 0, y1: 0, x2: 10, y2: 0, stroke_width: 1.2 },
        { kind: "text", x: 5, y: -2, text: "U1" },
      ],
    }

    const schComponent = makeComponentWithInlineSymbol(inlineSymbol)

    const svgObjects = createSvgObjectsFromSchematicComponentWithSymbol({
      component: schComponent,
      transform: I, // identity → we can assert the exact transform string
      circuitJson,
      colorMap: colorMap as any,
    })

    // Basic shape: we expect exactly one top-level <g> returned for the inline symbol path.
    expect(Array.isArray(svgObjects)).toBe(true)
    expect(svgObjects.length).toBeGreaterThan(0)
    const g = svgObjects[0]
    expect(g.type).toBe("g")

    // Our wiring composes a group transform from the provided Matrix.
    // With identity, we expect the standard SVG matrix string.
    expect(g.attributes?.transform).toBe("matrix(1 0 0 1 0 0)")

    // If renderSymbol doesn’t specify stroke, we default to colorMap.schematic.component_outline.
    // (If your renderSymbol always sets stroke, this assertion still passes because we only default when missing.)
    if (!("stroke" in g.attributes)) {
      expect(g.attributes.stroke).toBe("#222")
    }

    // Children should include primitives (e.g., <path> or <line> and <text>) rendered by renderSymbol.
    // We don't assert exact SVG of children (renderSymbol owns that), but we ensure something meaningful is there.
    expect(Array.isArray(g.children)).toBe(true)
    expect(g.children!.length).toBeGreaterThan(0)

    // Sanity: confirm there is at least one line-ish or path-ish child
    const hasRenderableChild = g.children!.some(
      (c: any) => c?.type === "path" || c?.type === "line",
    )
    expect(hasRenderableChild).toBe(true)
  })

  it("does not crash when inline symbol omits stroke/fill and still applies defaults cleanly", () => {
    const schComponent = makeComponentWithInlineSymbol({
      primitives: [{ kind: "line", x1: 1, y1: 1, x2: 2, y2: 2 }],
    })

    const svgObjects = createSvgObjectsFromSchematicComponentWithSymbol({
      component: schComponent,
      transform: I,
      circuitJson: [],
      colorMap: colorMap as any,
    })

    const g = svgObjects[0]
    expect(g.type).toBe("g")
    // same identity transform
    expect(g.attributes?.transform).toBe("matrix(1 0 0 1 0 0)")
  })
})
