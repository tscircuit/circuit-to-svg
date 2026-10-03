import type { AnyCircuitElement } from "circuit-json"
import circuitJson from "../assets/f1c-voltage-mismatch.json"

// Emitted by core's F1C100S AVCC voltage DRC regression, including its actual
// source-port references and schematic geometry.
export const f1cVoltageMismatch = circuitJson as AnyCircuitElement[]
