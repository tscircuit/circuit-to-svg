import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("pin error highlights can be disabled independently of the message overlay", async () => {
  const svg = convertCircuitJsonToSchematicSvg(f1cVoltageMismatch, {
    shouldDrawErrors: false,
    showErrorsInTextOverlay: true,
  })
  expect(svg).not.toContain('data-type="source_component_misconfigured_error"')
  expect(svg).not.toContain('data-type="source_port_error_callout"')
  expect(svg).toContain('data-type="error_text_overlay"')
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
