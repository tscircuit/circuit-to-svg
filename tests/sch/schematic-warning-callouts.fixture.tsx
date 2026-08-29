import { checkSchematicComponentMissingReferenceDesignatorText } from "@tscircuit/checks-latest"
import type { AnyCircuitElement } from "circuit-json"
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

export async function createMultipleMissingRefdesWarningCircuit(): Promise<{
  circuitJsonWithWarnings: AnyCircuitElement[]
  warningIds: string[]
}> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {/* @ts-expect-error Intentionally omit the required refdes. */}
      <chip symbol={CUSTOM_SYMBOL_WITHOUT_REFDES} schX={-2} />
      {/* @ts-expect-error Intentionally omit the required refdes. */}
      <chip symbol={CUSTOM_SYMBOL_WITHOUT_REFDES} schX={2} />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const warnings =
    checkSchematicComponentMissingReferenceDesignatorText(circuitJson)
  if (warnings.length !== 2) {
    throw new Error(
      `Expected the real schematic check to return two warnings, received ${warnings.length}`,
    )
  }

  return {
    circuitJsonWithWarnings: [...circuitJson, ...warnings],
    warningIds: warnings.map(
      (warning) => warning.schematic_component_styling_warning_id,
    ),
  }
}
