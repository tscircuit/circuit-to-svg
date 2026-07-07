import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { type INode, parseSync } from "svgson"

const flattenSvgNodes = (node: INode): INode[] => [
  node,
  ...node.children.flatMap(flattenSvgNodes),
]

test("net labels of the same net are hover-linked by a connectivity key", async () => {
  const { circuit } = getTestFixture()

  // The chip between R1 and C1 makes the connection render as a net label at
  // each endpoint (no drawn wire), so hovering one should highlight the other.
  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-4} />
      <chip name="U1" footprint="soic16" schX={0} schY={0} />
      <capacitor name="C1" capacitance="0.1uF" footprint="0402" schX={4} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSvg(circuit.getCircuitJson())
  const netLabelGroups = flattenSvgNodes(parseSync(svg)).filter(
    (node) =>
      node.name === "g" &&
      node.attributes.class?.split(" ").includes("sch-net-label"),
  )

  // Each endpoint yields a real net label wrapped in a hoverable group.
  expect(netLabelGroups.length).toBeGreaterThanOrEqual(2)

  // Every label of the net carries the same, non-empty connectivity key.
  const keys = netLabelGroups.map(
    (group) => group.attributes["data-subcircuit-connectivity-map-key"],
  )
  expect(keys[0]).toBeTruthy()
  expect(keys.every((key) => key === keys[0])).toBe(true)

  // That key is wired into the net-hover CSS, so hovering a label highlights
  // the whole net.
  expect(svg).toContain(
    `g.sch-net-label[data-subcircuit-connectivity-map-key="${keys[0]}"]`,
  )
})
