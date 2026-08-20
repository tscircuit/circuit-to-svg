import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib"
import speakerCircuitJson from "./assets/esp32-bluetooth-speaker.json"

const speakerCircuit = speakerCircuitJson as AnyCircuitElement[]
const EXPECTED_ELEMENT_COUNT = 2450
const SNAPSHOT_WIDTH = 1200
const SNAPSHOT_HEIGHT = 848

test("renders all uploaded speaker schematic sheets inside their frames", () => {
  expect(speakerCircuit).toHaveLength(EXPECTED_ELEMENT_COUNT)

  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(speakerCircuit, {
    width: SNAPSHOT_WIDTH,
    height: SNAPSHOT_HEIGHT,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
