import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text anchor alignment", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width={20} height={20}>
      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Top Center" anchorAlignment="center" />
      </group>

      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Center" anchorAlignment="center" />
      </group>

      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext
          text="Anchor Bottom Center"
          anchorAlignment="center"
        />
      </group>
    </board>,
  )

  circuit.render()

  const circuitJson = circuit.getCircuitJson()

  const silkscreenText = circuitJson.filter(
    (element) => element.type === "pcb_silkscreen_text",
  )

  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
