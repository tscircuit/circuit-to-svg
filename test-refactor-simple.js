// Simple test script for the refactored net label symbol rendering
import { convertCircuitJsonToSchematicSvg } from "./dist/index.js"
const test1Data = [
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
]

try {
  const svg1 = convertCircuitJsonToSchematicSvg(test1Data)
} catch (error) {}
const test2Data = [
  {
    type: "schematic_net_label",
    text: "GND_LEFT",
    symbol_name: "ground_left",
    center: { x: -5, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -10, y: 0 },
  },
  {
    type: "schematic_net_label",
    text: "GND_RIGHT",
    symbol_name: "ground_right",
    center: { x: 5, y: 0 },
    anchor_side: "right",
    anchor_position: { x: 10, y: 0 },
  },
]

try {
  const svg2 = convertCircuitJsonToSchematicSvg(test2Data)
} catch (error) {}
const test3Data = [
  {
    type: "schematic_net_label",
    text: "N_GND",
    symbol_name: "ground_down",
    center: { x: 0, y: 0 },
    anchor_side: "left",
    anchor_position: { x: -5, y: 0 },
  },
]

try {
  const svg3 = convertCircuitJsonToSchematicSvg(test3Data)
} catch (error) {}
