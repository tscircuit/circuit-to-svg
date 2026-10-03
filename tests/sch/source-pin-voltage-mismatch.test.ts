import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("shouldDrawErrors alone displays the F1C voltage DRC at its schematic pin", async () => {
  const svg = convertCircuitJsonToSchematicSvg(f1cVoltageMismatch, {
    shouldDrawErrors: true,
  })
  const root = await parse(svg)
  const markers = root.children.filter(
    (node) =>
      node.attributes["data-type"] === "source_component_misconfigured_error",
  )
  expect(markers.map((node) => node.attributes["data-source-port-id"])).toEqual(
    ["source_port_0", "source_port_1"],
  )
  const callout = root.children.find(
    (node) => node.attributes["data-type"] === "source_port_error_callout",
  )
  expect(callout?.attributes["data-source-port-id"]).toBe("source_port_0")
  expect(
    callout?.children
      .find((node) => node.name === "text")
      ?.children.map((span) => span.children[0]?.value)
      .join(" "),
  ).toBe(
    "U_F1C.AVCC requires 2.8 V, but is connected to U_REG.VOUT, which provides 1.8 V.",
  )
  expect(svg).not.toContain('data-type="error_text_overlay"')
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
