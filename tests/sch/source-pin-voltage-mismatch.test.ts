import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("F1C voltage DRC highlights both referenced pins and displays its message", async () => {
  const svg = convertCircuitJsonToSchematicSvg(f1cVoltageMismatch, {
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })
  const root = await parse(svg)
  const markers = root.children.filter(
    (node) =>
      node.attributes["data-type"] === "source_component_misconfigured_error",
  )
  expect(markers.map((node) => node.attributes["data-source-port-id"])).toEqual(
    ["source_port_0", "source_port_1"],
  )
  const overlay = root.children.find(
    (node) => node.attributes["data-type"] === "error_text_overlay",
  )
  expect(overlay?.children[0]?.children[0]?.value).toBe(
    "U_F1C.AVCC requires 2.8 V, but is connected to U_REG.VOUT, which provides 1.8 V.",
  )
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
