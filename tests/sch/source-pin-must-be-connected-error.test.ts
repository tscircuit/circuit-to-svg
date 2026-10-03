import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("single-source-port errors draw their message at the affected schematic pin", async () => {
  const circuitJson: AnyCircuitElement[] = [
    ...f1cVoltageMismatch.filter(
      (element) =>
        element.type !== "source_component_misconfigured_error" &&
        element.type !== "schematic_trace" &&
        element.type !== "source_trace" &&
        element.type !== "schematic_net_label",
    ),
    {
      type: "source_pin_must_be_connected_error",
      source_pin_must_be_connected_error_id:
        "source_pin_must_be_connected_error_0",
      error_type: "source_pin_must_be_connected_error",
      source_component_id: "source_component_0",
      source_port_id: "source_port_0",
      message: "U_F1C.AVCC must be connected to a power supply.",
    },
  ]
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    shouldDrawErrors: true,
  })
  const root = await parse(svg)
  const markers = root.children.filter(
    (node) =>
      node.attributes["data-type"] === "source_pin_must_be_connected_error",
  )
  expect(markers.map((node) => node.attributes["data-source-port-id"])).toEqual(
    ["source_port_0"],
  )
  expect(svg).toContain('data-type="source_port_error_callout"')
  expect(svg).not.toContain('data-type="error_text_overlay"')
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
