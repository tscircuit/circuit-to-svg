import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// Test that N_ prefix is rendered with overline

test("schematic box component stroke rendering", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint={"soic8"}
        schPinStyle={{
          pin3: { bottomMargin: 0.1 },
        }}
      />
      <chip name="U2" footprint={"soic8"} schX={2} />
      <chip
        name="U3"
        footprint={"soic8"}
        schY={-2}
        schPinArrangement={{
          bottomSide: {
            direction: "left-to-right",
            pins: ["pin1", "pin2", "pin3", "pin4"],
          },
          topSide: {
            direction: "left-to-right",
            pins: ["pin5", "pin6", "pin7", "pin8"],
          },
        }}
      />
      <schematicbox
        paddingTop={0.2}
        paddingBottom={0.2}
        strokeStyle="dashed"
        titleAlignment="top_left"
        titleInside={false}
        title="U1 pins"
        titleFontSize={0.13}
        overlay={[".U1 > .pin1", ".U1 > .pin2", ".U1 > .pin3", ".U1 > .pin4"]}
        schX={0}
        schY={0}
      />
      <schematicbox
        padding={0.3}
        strokeStyle="dashed"
        title="U2+U1 pins"
        titleInside={true}
        titleFontSize={0.13}
        titleAlignment="bottom_center"
        overlay={[
          ".U2 > .pin1",
          ".U2 > .pin2",
          ".U2 > .pin3",
          ".U2 > .pin4",
          ".U1 > .pin5",
          ".U1 > .pin6",
          ".U1 > .pin7",
          ".U1 > .pin8",
        ]}
        schX={0}
        schY={0}
      />
      <schematicbox
        padding={0.15}
        strokeStyle="dashed"
        title="U3 Bottom pins"
        titleFontSize={0.13}
        titleAlignment="bottom_center"
        overlay={[".U3 > .pin1", ".U3 > .pin2", ".U3 > .pin3", ".U3 > .pin4"]}
        schX={0}
        schY={0}
      />
      <schematicbox
        paddingRight={0.15}
        paddingLeft={0.15}
        title="U3 Top pins"
        titleFontSize={0.13}
        titleAlignment="top_center"
        strokeStyle="dashed"
        overlay={[".U3 > .pin5", ".U3 > .pin6", ".U3 > .pin7", ".U3 > .pin8"]}
        schX={0}
        schY={0}
      />
      <schematicbox
        strokeStyle="dashed"
        title="Fixed size box"
        titleAlignment="bottom_center"
        titleFontSize={0.13}
        titleInside={true}
        width={2}
        height={2}
        schX={3}
        schY={-2}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
