import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { type INode, parseSync } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const flattenSvgNodes = (node: INode): INode[] => [
  node,
  ...node.children.flatMap(flattenSvgNodes),
]

test("power/ground symbol net labels are not wrapped in a hover group", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={0} />
      <trace from=".R1 > .pin1" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[]

  // Sanity check: this circuit produces a symbol-based (ground) net label.
  const symbolLabel = circuitJson.find(
    (elm) => elm.type === "schematic_net_label" && Boolean(elm.symbol_name),
  )
  expect(symbolLabel).toBeDefined()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // Symbol net labels are drawn by the symbol renderer and must not get the
  // net-label hover group.
  const netLabelGroups = flattenSvgNodes(parseSync(svg)).filter(
    (node) =>
      node.name === "g" &&
      node.attributes.class?.split(" ").includes("sch-net-label"),
  )
  expect(netLabelGroups).toHaveLength(0)
})
