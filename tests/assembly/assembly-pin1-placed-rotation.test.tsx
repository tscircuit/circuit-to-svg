import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import {
  annotateAssemblyPin1References,
  createAssemblyPin1Fixture,
  expectAssemblyPin1AtPlacedPorts,
} from "tests/fixtures/assembly-pin1-fixture"

test("assembly pin1 stays nearest the placed pin on both layers at all cardinal rotations", async () => {
  const fixture = await createAssemblyPin1Fixture("rotation")
  const svg = convertCircuitJsonToAssemblySvg(fixture.soup, {
    width: fixture.width,
    height: fixture.height,
  })
  expectAssemblyPin1AtPlacedPorts(svg, fixture)
  expect(annotateAssemblyPin1References(svg, fixture)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
