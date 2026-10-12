import { expect, test } from "bun:test"
import { renderViaLayerStack } from "./pcb-via-layer-visibility.fixture"

test("snapshots of via visibility across the four-layer stack", () => {
  expect(renderViaLayerStack()).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-layer-visibility",
  )
})
