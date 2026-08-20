import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import speakerCircuitJson from "./assets/esp32-bluetooth-speaker.json"

const speakerCircuit = speakerCircuitJson as AnyCircuitElement[]
const BATTERY_POWER_SHEET_INDEX = 2
const EXPECTED_ELEMENT_COUNT = 2450
const SNAPSHOT_WIDTH = 1200
const SNAPSHOT_HEIGHT = 600

test("renders the uploaded speaker battery sheet inside its frame", () => {
  expect(speakerCircuit).toHaveLength(EXPECTED_ELEMENT_COUNT)

  const svg = convertCircuitJsonToSchematicSvg(speakerCircuit, {
    schematicSheetIndex: BATTERY_POWER_SHEET_INDEX,
    width: SNAPSHOT_WIDTH,
    height: SNAPSHOT_HEIGHT,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
