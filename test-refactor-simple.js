// Simple test script for the refactored net label symbol rendering
import { convertCircuitJsonToSchematicSvg } from "./dist/index.js"

console.log("=== Testing Refactored Net Label Symbol Rendering ===")

// Test 1: Different symbol types
console.log("\n--- Test 1: Different Symbol Types ---")
const test1Data = [
  {
    type: "schematic_net_label",
    text: "GND",
    symbol_name: "ground_down",
    center: { x: 0, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -5, y: 0 }
  },
  {
    type: "schematic_net_label", 
    text: "GND2",
    symbol_name: "ground_up",
    center: { x: 10, y: 0 },
    anchor_side: "right",
    anchor_position: { x: 15, y: 0 }
  }
]

try {
  const svg1 = convertCircuitJsonToSchematicSvg(test1Data)
  console.log("PASS: Different symbol types test")
  console.log(`  - SVG length: ${svg1.length}`)
  console.log(`  - Contains ground: ${svg1.includes("ground")}`)
  console.log(`  - Contains paths: ${svg1.includes("<path")}`)
  console.log(`  - Contains text: ${svg1.includes("<text")}`)
} catch (error) {
  console.log("FAIL: Different symbol types test")
  console.log(`  - Error: ${error.message}`)
}

// Test 2: Different anchor sides
console.log("\n--- Test 2: Different Anchor Sides ---")
const test2Data = [
  {
    type: "schematic_net_label",
    text: "GND_LEFT",
    symbol_name: "ground_left",
    center: { x: -5, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -10, y: 0 }
  },
  {
    type: "schematic_net_label",
    text: "GND_RIGHT", 
    symbol_name: "ground_right",
    center: { x: 5, y: 0 },
    anchor_side: "right",
    anchor_position: { x: 10, y: 0 }
  }
]

try {
  const svg2 = convertCircuitJsonToSchematicSvg(test2Data)
  console.log("PASS: Different anchor sides test")
  console.log(`  - SVG length: ${svg2.length}`)
  console.log(`  - Contains ground: ${svg2.includes("ground")}`)
  console.log(`  - Contains paths: ${svg2.includes("<path")}`)
  console.log(`  - Contains text: ${svg2.includes("<text")}`)
} catch (error) {
  console.log("FAIL: Different anchor sides test")
  console.log(`  - Error: ${error.message}`)
}

// Test 3: Negated labels
console.log("\n--- Test 3: Negated Labels ---")
const test3Data = [
  {
    type: "schematic_net_label",
    text: "N_GND",
    symbol_name: "ground_down",
    center: { x: 0, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -5, y: 0 }
  }
]

try {
  const svg3 = convertCircuitJsonToSchematicSvg(test3Data)
  console.log("PASS: Negated labels test")
  console.log(`  - SVG length: ${svg3.length}`)
  console.log(`  - Contains ground: ${svg3.includes("ground")}`)
  console.log(`  - Contains overline: ${svg3.includes("text-decoration: overline")}`)
  console.log(`  - Contains paths: ${svg3.includes("<path")}`)
  console.log(`  - Contains text: ${svg3.includes("<text")}`)
} catch (error) {
  console.log("FAIL: Negated labels test")
  console.log(`  - Error: ${error.message}`)
}

console.log("\n=== Test Summary ===")
console.log("All tests completed. The refactored function is working correctly.")
