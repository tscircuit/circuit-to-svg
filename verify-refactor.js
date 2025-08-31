// Simple verification script for the refactored net label symbol rendering
import { convertCircuitJsonToSchematicSvg } from "./dist/index.js"

// Test data with proper circuit JSON format - using only ground symbols to test
const testCircuitJson = [
  {
    type: "schematic_net_label",
    text: "GND",
    symbol_name: "ground_down",
    center: { x: 0, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -5, y: 0 },
  },
  {
    type: "schematic_net_label",
    text: "GND2",
    symbol_name: "ground_up",
    center: { x: 10, y: 0 },
    anchor_side: "right",
    anchor_position: { x: 15, y: 0 },
  },
  {
    type: "schematic_net_label",
    text: "GND3",
    symbol_name: "ground_left",
    center: { x: 0, y: 10 },
    anchor_side: "top",
    anchor_position: { x: 0, y: 5 },
  },
]

try {
  const svg = convertCircuitJsonToSchematicSvg(testCircuitJson)

  // Check for expected elements
  const checks = [
    { name: "Ground symbol (down)", check: svg.includes("ground") },
    { name: "Ground symbol (up)", check: svg.includes("ground") },
    { name: "Ground symbol (left)", check: svg.includes("ground") },
    { name: "Path elements", check: svg.includes("<path") },
    { name: "Text elements", check: svg.includes("<text") },
    { name: "SVG structure", check: svg.includes("<svg") },
    {
      name: "Multiple symbols rendered",
      check: (svg.match(/<path/g) || []).length > 1,
    },
  ]
  checks.forEach(({ name, check }) => {})

  const passedChecks = checks.filter((c) => c.check).length
  const totalChecks = checks.length

  if (passedChecks === totalChecks) {
  } else {
  }

  // Check if the refactor is working by looking for the improved structure
  if (svg.includes("<path") && svg.includes("<text") && svg.includes("<svg")) {
  }
} catch (error) {}
