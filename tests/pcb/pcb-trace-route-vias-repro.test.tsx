import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToPcbSvg } from "lib"
import RouteViaReproduction from "./pcb-trace-route-vias-repro.fixture"

test("TSX route vias match the labelled standalone controls", () => {
  const circuit = new Circuit()
  circuit.add(<RouteViaReproduction />)
  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    width: 1280,
    height: 720,
    layer: "bottom",
    showPcbNotes: true,
    showSolderMask: true,
    shouldDrawErrors: false,
    shouldDrawRatsNest: false,
    includeVersion: false,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
