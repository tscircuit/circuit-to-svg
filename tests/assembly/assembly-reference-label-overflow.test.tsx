import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("repro: long assembly reference label exceeds its component body", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="12mm">
      <chip name="U_DEBUGGER" footprint="qfn32" />
    </board>,
  )

  const assemblySvg = convertCircuitJsonToAssemblySvg(
    circuit.getCircuitJson() as any,
    {},
  )
  const labelFontSize = Number(
    assemblySvg.match(
      /class="assembly-component-label"[^>]*font-size="([0-9.]+)px"/,
    )?.[1],
  )

  expect(labelFontSize).toBe(58)
  expect(assemblySvg).toContain("U_DEBUGGER")
  expect(assemblySvg).toMatchSvgSnapshot(import.meta.path)
})
