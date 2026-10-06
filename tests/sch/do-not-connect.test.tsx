import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { parseSync } from "svgson"

test("do_not_connect draws crosses for symbol and box pins, including rotated symbols", async () => {
  const { circuit } = getTestFixture()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <switch name="SW1" type="spdt" schX={-3} schY={2} />
      <switch name="SW2" type="spdt" schRotation={90} schX={3} schY={2} />
      <chip
        name="U1"
        footprint="pinrow4"
        schY={-2}
        pinLabels={{
          pin1: "NC_LEFT",
          pin2: "OPEN",
          pin3: "NC_RIGHT",
          pin4: "USED",
        }}
        schPortArrangement={{
          leftSide: { pins: [1, 2], direction: "top-to-bottom" },
          rightSide: { pins: [3, 4], direction: "top-to-bottom" },
        }}
      />
      <trace from=".SW1 > .pin1" to=".SW1 > .pin2" />
    </board>,
  )
  await circuit.renderUntilSettled()
  // Exercise the renderer's Circuit JSON contract independently of core/props versions.
  const circuitJson = circuit.getCircuitJson().map((elm) => {
    if (elm.type !== "source_port") return elm
    return {
      ...elm,
      do_not_connect:
        elm.pin_number === 3 || elm.port_hints?.includes("NC_LEFT") === true,
    }
  })
  const svg = convertCircuitJsonToSchematicSvg(circuitJson)
  const markers = parseSync(svg).children.filter(
    (node) => node.attributes.class === "sch-port-no-connect",
  )
  const ncPortIds = circuitJson.flatMap((elm) =>
    elm.type === "source_port" && elm.do_not_connect
      ? [elm.source_port_id]
      : [],
  )
  expect(
    markers.map((node) => node.attributes["data-source-port-id"]).sort(),
  ).toEqual(ncPortIds.sort())
  expect(markers).toHaveLength(4)
  expect(svg).toMatchSvgSnapshot(import.meta.path)

  const debugSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    drawPorts: true,
    colorOverrides: { schematic: { no_connect: "#ff00ff" } },
  })
  const debugMarkers = parseSync(debugSvg).children.filter(
    (node) => node.attributes.class === "sch-port-no-connect",
  )
  expect(debugMarkers).toHaveLength(4)
  expect(
    debugMarkers.every((node) => node.attributes.stroke === "#ff00ff"),
  ).toBe(true)
})
