import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pill smtpad shape", () => {
  expect(
    convertCircuitJsonToPcbSvg([
      // Test 1: Standard pill with equal width and height
      {
        type: "pcb_smtpad",
        x: 0,
        y: 0,
        layer: "top" as const,
        shape: "pill",
        width: 1,
        height: 1,
        radius: 0.2, // Rounded corners
        pcb_smtpad_id: "test_pad_1",
      },

      // Test 2: Pill with different width and height
      {
        type: "pcb_smtpad",
        x: 5,
        y: 5,
        layer: "top" as const,
        shape: "pill",
        width: 1.5, // Wider pill
        height: 1, // Same height
        radius: 0.3, // Larger rounded corners
        pcb_smtpad_id: "test_pad_2",
      },

      // Test 3: Pill with larger height than width
      {
        type: "pcb_smtpad",
        x: -5,
        y: -5,
        layer: "top" as const,
        shape: "pill",
        width: 1, // Narrower width
        height: 2, // Taller pill
        radius: 0.4, // Large rounded corners
        pcb_smtpad_id: "test_pad_3",
      },

      // Test 4: Pill with smaller radius
      {
        type: "pcb_smtpad",
        x: -5,
        y: 5,
        layer: "top" as const,
        shape: "pill",
        width: 1.5,
        height: 1.5,
        radius: 0.1, // Small rounded corners
        pcb_smtpad_id: "test_pad_4",
      },

      // Test 5: Very large pill shape
      {
        type: "pcb_smtpad",
        x: 5,
        y: -5,
        layer: "top" as const,
        shape: "pill",
        width: 3, // Much wider pill
        height: 2, // Much taller pill
        radius: 0.5, // Larger rounded corners
        pcb_smtpad_id: "test_pad_5",
      },
    ]),
  ).toMatchSvgSnapshot(import.meta.path)
})
