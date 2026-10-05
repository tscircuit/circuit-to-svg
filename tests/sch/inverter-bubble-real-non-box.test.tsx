// Fixture provenance: tests/assets/lmg342x-inversion-bubbles.json is a verbatim
// subset of lmg342x-bb-evm.circuit.json.gz from tscircuit/circuit-json-to-tscircuit
// (tests/fixtures/ti-evms/). It was produced by filtering that fixture by
// schematic_component_id, keeping only the components that own a port with
// is_drawn_with_inversion_circle set, plus the source_component, source_port and
// owned schematic primitives those components reference.
//
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import circuitJson from "../assets/lmg342x-inversion-bubbles.json"

test("renders inversion bubbles on real non-box components", () => {
  const bubbledPorts = (circuitJson as { type: string }[]).filter(
    (elm) =>
      elm.type === "schematic_port" &&
      (elm as { is_drawn_with_inversion_circle?: boolean })
        .is_drawn_with_inversion_circle === true,
  )
  expect(bubbledPorts.length).toBeGreaterThan(0)

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as never)

  // Every bubbled port should render exactly one bubble.
  expect(svg.match(/sch-inversion-bubble/g)).toHaveLength(bubbledPorts.length)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
