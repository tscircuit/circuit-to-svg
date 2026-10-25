import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import {
  annotateAssemblyPin1References,
  createAssemblyPin1Fixture,
  expectAssemblyPin1AtPlacedPorts,
} from "tests/fixtures/assembly-pin1-fixture"

test("assembly pin1 follows source numbers and hints rather than PCB port order", async () => {
  const fixture = await createAssemblyPin1Fixture("metadata")
  const svg = convertCircuitJsonToAssemblySvg(fixture.soup, {
    width: fixture.width,
    height: fixture.height,
  })
  expectAssemblyPin1AtPlacedPorts(svg, fixture)

  // A1 can also be a semantic alias of another pin. A known physical pin
  // number remains authoritative; adding that alias cannot move the marker.
  const numberedComponent = fixture.soup.find(
    (element) => element.type === "source_component" && element.name === "U2",
  )
  if (!numberedComponent || numberedComponent.type !== "source_component")
    throw new Error("Missing numbered component U2 in fixture")
  const aliasedSoup = fixture.soup.map((element) =>
    element.type === "source_port" &&
    element.source_component_id === numberedComponent.source_component_id &&
    element.name === "FOUR"
      ? { ...element, port_hints: ["A1", "FOUR"] }
      : element,
  )
  const aliasedSvg = convertCircuitJsonToAssemblySvg(aliasedSoup, {
    width: fixture.width,
    height: fixture.height,
  })
  expectAssemblyPin1AtPlacedPorts(aliasedSvg, fixture)
  expect(aliasedSvg).toBe(svg)

  const hintedComponent = fixture.soup.find(
    (element) => element.type === "source_component" && element.name === "U3",
  )
  if (!hintedComponent || hintedComponent.type !== "source_component")
    throw new Error("Missing hinted component U3 in fixture")
  for (const identifier of ["1", "pin_1", "pin1_1"]) {
    const synonymousSoup = fixture.soup.map((element) =>
      element.type === "source_port" &&
      element.source_component_id === hintedComponent.source_component_id &&
      element.name === "ONE"
        ? { ...element, port_hints: [identifier, "ONE"] }
        : element,
    )
    expect(
      convertCircuitJsonToAssemblySvg(synonymousSoup, {
        width: fixture.width,
        height: fixture.height,
      }),
    ).toBe(svg)
  }
  expect(annotateAssemblyPin1References(svg, fixture)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
