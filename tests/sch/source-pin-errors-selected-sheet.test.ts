import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("only pins on the selected schematic sheet receive error highlights", async () => {
  const circuitJson: AnyCircuitElement[] = [
    ...f1cVoltageMismatch.map((element) =>
      element.type.startsWith("schematic_")
        ? {
            ...element,
            schematic_sheet_id:
              element.type === "schematic_port" &&
              element.source_port_id === "source_port_1"
                ? "schematic_sheet_2"
                : "schematic_sheet_1",
          }
        : element,
    ),
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "F1C supply",
      sheet_width: 20,
      sheet_height: 10,
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_2",
      name: "Regulator",
      sheet_width: 20,
      sheet_height: 10,
    },
  ]
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    schematicSheetId: "schematic_sheet_1",
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })
  const root = await parse(svg)
  const markers = root.children.filter(
    (node) =>
      node.attributes["data-type"] === "source_component_misconfigured_error",
  )
  expect(markers.map((node) => node.attributes["data-source-port-id"])).toEqual(
    ["source_port_0"],
  )
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
