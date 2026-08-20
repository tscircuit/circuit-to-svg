import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib"
import circuitJson from "./assets/esp32-bluetooth-speaker.json"

const circuit = circuitJson as AnyCircuitElement[]
const SHEET_WIDTH = 1200
const SHEET_HEIGHT = 848

test("repro: renders the complete esp32 bluetooth speaker schematic", () => {
  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(circuit, {
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
