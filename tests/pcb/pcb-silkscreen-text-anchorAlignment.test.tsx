import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToPcbSvg } from "lib"

test("repro: silkscreen text anchor alignment", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width={20} height={20}>
      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Top Center" anchorAlignment="top_center" />
      </group>

      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Center" anchorAlignment="center" />
      </group>

      <group pcbX={0} pcbY={0}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Bottom Center" anchorAlignment="bottom_center" />
      </group>

{/* 
      <group pcbX={0} pcbY={-5}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Top Center" anchorAlignment="top_center" />
      </group>

      <group pcbX={0} pcbY={-5}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Center" anchorAlignment="center" />
      </group>

      <group pcbX={0} pcbY={-5}>
        <silkscreencircle radius="0.25mm" />
        <silkscreentext text="Anchor Bottom Center" anchorAlignment="bottom_center" />
      </group> */}
    </board>,
  )

  circuit.render()

  const circuitJson = circuit.getCircuitJson()

  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
