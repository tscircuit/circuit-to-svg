import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToPcbSvg } from "lib"
import RouteViaReproduction from "./pcb-trace-route-vias-repro.fixture"
import { parseSync, type INode } from "svgson"

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
  const outerRadii: string[] = []
  const innerRadii: string[] = []
  const visit = (node: INode) => {
    if (node.attributes.class === "pcb-hole-outer")
      outerRadii.push(node.attributes.r!)
    if (node.attributes.class === "pcb-hole-inner")
      innerRadii.push(node.attributes.r!)
    for (const child of node.children) visit(child)
  }
  visit(parseSync(svg))
  // Two route vias and two standalone controls must have identical pad/drill sizes.
  expect(outerRadii).toHaveLength(4)
  expect(innerRadii).toHaveLength(4)
  expect(new Set(outerRadii).size).toBe(1)
  expect(new Set(innerRadii).size).toBe(1)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
