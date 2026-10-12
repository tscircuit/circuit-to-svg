import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { LayerRef } from "circuit-json"
import {
  circuit,
  renderViaLayerView,
  vias,
} from "./pcb-via-layer-visibility.fixture"

test("PCB copper views respect each via's physical layers", () => {
  const original = structuredClone(circuit)
  const cases: [LayerRef | undefined, boolean[]][] = [
    [undefined, [true, true, true, true]],
    ["top", [true, true, false, false]],
    ["inner1", [true, true, true, false]],
    ["inner2", [true, true, true, true]],
    ["bottom", [true, false, false, true]],
  ]

  for (const [layer, visible] of cases) {
    const { pixels } = new Resvg(renderViaLayerView(layer)).render()
    for (const [index, via] of vias.entries()) {
      const x = Math.round((via.x + 8) * 40)
      const offset = (120 * 640 + x) * 4
      expect({
        layer,
        via: via.pcb_via_id,
        pixel: Array.from(pixels.subarray(offset, offset + 4)),
      }).toEqual({
        layer,
        via: via.pcb_via_id,
        pixel: visible[index] ? [255, 38, 226, 255] : [0, 0, 0, 255],
      })
    }
  }
  expect(circuit).toEqual(original)
})
