import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("should render a schematic group as a schematic box", () => {
  const circuit = new Circuit()

  circuit.add(
    <board>
      <schematictext text="Schematic Box" schY={-3} fontSize={0.3} />
      <group showAsSchematicBox>
        <resistor name="R1" resistance="1k" footprint={"0402"} />
        <capacitor name="C1" capacitance="1uF" footprint={"0402"} />
      </group>
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const schematicGroup = circuitJson.find(
    (elm) => elm.type === "schematic_group",
  )

  expect(schematicGroup).toMatchInlineSnapshot(`
  {
    "center": {
      "x": 0,
      "y": 0,
    },
    "height": 0,
    "is_subcircuit": undefined,
    "name": "unnamed_group1",
    "schematic_component_ids": [],
    "schematic_group_id": "schematic_group_0",
    "show_as_schematic_box": true,
    "source_group_id": "source_group_0",
    "subcircuit_id": null,
    "type": "schematic_group",
    "width": 0,
  }
`)

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  expect(svg).toContain('class="schematic-box"')
  expect(svg).not.toContain('data-circuit-json-type="schematic_component"')

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
