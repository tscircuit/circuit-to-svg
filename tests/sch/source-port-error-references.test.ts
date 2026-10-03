import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("I2C and trace errors resolve their source-port reference fields to schematic pins", async () => {
  const errors: AnyCircuitElement[] = [
    {
      type: "source_i2c_misconfigured_error",
      source_i2c_misconfigured_error_id: "source_i2c_misconfigured_error_0",
      error_type: "source_i2c_misconfigured_error",
      source_port_ids: ["source_port_0", "source_port_1"],
      message: "Pin roles on this connection are incompatible.",
    },
    {
      type: "source_trace_not_connected_error",
      source_trace_not_connected_error_id: "source_trace_not_connected_error_0",
      error_type: "source_trace_not_connected_error",
      connected_source_port_ids: ["source_port_0"],
      message: "Could not connect U_F1C.AVCC to the specified supply.",
    },
  ]
  for (const error of errors) {
    const svg = convertCircuitJsonToSchematicSvg(
      [
        ...f1cVoltageMismatch.filter(
          (element) => element.type !== "source_component_misconfigured_error",
        ),
        error,
      ],
      { shouldDrawErrors: true },
    )
    const root = await parse(svg)
    const markers = root.children.filter(
      (node) => node.attributes["data-type"] === error.type,
    )
    expect(
      markers.map((node) => node.attributes["data-source-port-id"]),
    ).toEqual(
      error.type === "source_i2c_misconfigured_error"
        ? ["source_port_0", "source_port_1"]
        : ["source_port_0"],
    )
    expect(
      root.children.filter(
        (node) => node.attributes["data-type"] === "source_port_error_callout",
      ),
    ).toHaveLength(1)
    await expect(svg).toMatchSvgSnapshot(import.meta.path, error.type)
  }
})
