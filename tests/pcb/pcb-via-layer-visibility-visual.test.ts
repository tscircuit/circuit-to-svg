import { expect, test } from "bun:test"
import { renderViaLayerView } from "./pcb-via-layer-visibility.fixture"

test("snapshots of via visibility across the four-layer stack", () => {
  for (const layer of ["top", "inner1", "inner2", "bottom"] as const) {
    expect(renderViaLayerView(layer)).toMatchSvgSnapshot(
      import.meta.path,
      `pcb-via-layer-visibility-${layer}`,
    )
  }
  expect(renderViaLayerView()).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-layer-visibility-overview",
  )
})
