import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import circuitJson from "./assets/esp32-bluetooth-speaker.json"

const circuit = circuitJson as AnyCircuitElement[]
const BATTERY_POWER_SHEET_INDEX = 2
const SHEET_WIDTH = 1200
const SHEET_HEIGHT = 848

test("repro: renders the esp32 speaker battery power sheet", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuit, {
    schematicSheetIndex: BATTERY_POWER_SHEET_INDEX,
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
