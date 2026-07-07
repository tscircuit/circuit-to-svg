import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { type INode, parseSync } from "svgson"

const flattenSvgNodes = (node: INode): INode[] => [
  node,
  ...node.children.flatMap(flattenSvgNodes),
]

const getGroupKeys = (
  svg: string,
  className: string,
): Array<string | undefined> =>
  flattenSvgNodes(parseSync(svg))
    .filter(
      (node) =>
        node.name === "g" &&
        node.attributes.class?.split(" ").includes(className),
    )
    .map((node) => node.attributes["data-subcircuit-connectivity-map-key"])

test("a net label shares the connectivity key of the net's traces", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-3} />
      <capacitor name="C1" capacitance="0.1uF" footprint="0402" schX={3} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.MYNET" />
    </board>,
  )
  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSvg(circuit.getCircuitJson())

  // The named net renders both a drawn trace and a real net label; they must
  // carry the same connectivity key so hovering either highlights both.
  const [netLabelKey] = getGroupKeys(svg, "sch-net-label")
  expect(netLabelKey).toBeTruthy()

  const traceKeys = getGroupKeys(svg, "sch-trace")
  expect(traceKeys).toContain(netLabelKey)
})
