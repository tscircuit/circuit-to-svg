import {
  checkSchematicComponentMissingReferenceDesignatorText,
  runAllSchematicChecks,
} from "@tscircuit/checks-latest"
import { type AnyCircuitElement, schematic_component } from "circuit-json"
import { Circuit } from "tscircuit"

const CUSTOM_SYMBOL_WITHOUT_REFDES = (
  <symbol>
    <schematicrect width={2} height={1} isFilled fillColor="#fff7cc" />
    <schematictext text="CUSTOM" fontSize={0.18} />
  </symbol>
)

export async function createMissingRefdesWarningCircuit(): Promise<{
  circuitJsonWithWarning: AnyCircuitElement[]
  warningMessage: string
  warningId: string
}> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {/* @ts-expect-error Intentionally omit the required refdes. */}
      <chip symbol={CUSTOM_SYMBOL_WITHOUT_REFDES} />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const warnings =
    checkSchematicComponentMissingReferenceDesignatorText(circuitJson)
  if (warnings.length !== 1) {
    throw new Error(
      `Expected the real schematic check to return one warning, received ${warnings.length}`,
    )
  }
  const warning = warnings[0]!

  return {
    circuitJsonWithWarning: [...circuitJson, warning],
    warningMessage: warning.message,
    warningId: warning.schematic_component_styling_warning_id,
  }
}

export async function createDifferentGeneratedWarningsCircuit(): Promise<{
  circuitJsonWithWarnings: AnyCircuitElement[]
  warningIds: string[]
  stylingIssueTypes: string[]
}> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {/* @ts-expect-error Intentionally omit the required refdes. */}
      <chip symbol={CUSTOM_SYMBOL_WITHOUT_REFDES} schX={-4} />
      <chip name="U1" footprint="soic8" schHeight={0.4} />
      <chip name="U2" footprint="soic8" schHeight={2} schX={4} />
    </board>,
  )

  await circuit.renderUntilSettled()
  // Normalize TSX output so defaulted schematic fields are present for every
  // published schematic check (including is_box_with_pins).
  const circuitJson = circuit
    .getCircuitJson()
    .map((element) =>
      element.type === "schematic_component"
        ? schematic_component.parse(element)
        : element,
    )
  const warnings = await runAllSchematicChecks(circuitJson)
  if (warnings.length !== 4) {
    throw new Error(
      `Expected the real schematic checks to return four warnings, received ${warnings.length}`,
    )
  }

  return {
    circuitJsonWithWarnings: [...circuitJson, ...warnings],
    warningIds: warnings.map(
      (warning) => warning.schematic_component_styling_warning_id,
    ),
    stylingIssueTypes: warnings.map((warning) => warning.styling_issue_type),
  }
}
