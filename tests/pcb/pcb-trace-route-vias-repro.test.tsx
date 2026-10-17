import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToPcbSvg } from "lib"
import RouteViaReproduction from "./pcb-trace-route-vias-repro.fixture"
import { parseSync, type INode } from "svgson"

function collectViaRadii({
  node,
  outerRadii,
  innerRadii,
}: {
  node: INode
  outerRadii: string[]
  innerRadii: string[]
}) {
  if (node.attributes.class === "pcb-hole-outer")
    outerRadii.push(node.attributes.r!)
  if (node.attributes.class === "pcb-hole-inner")
    innerRadii.push(node.attributes.r!)
  for (const child of node.children)
    collectViaRadii({ node: child, outerRadii, innerRadii })
}

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
  collectViaRadii({ node: parseSync(svg), outerRadii, innerRadii })
  // Two route vias and two standalone controls must have identical pad/drill sizes.
  expect(outerRadii).toHaveLength(4)
  expect(innerRadii).toHaveLength(4)
  expect(new Set(outerRadii).size).toBe(1)
  expect(new Set(innerRadii).size).toBe(1)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
