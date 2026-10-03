import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { parse } from "svgson"
import { f1cVoltageMismatch } from "../fixtures/f1c-voltage-mismatch"

test("missing port references are skipped and duplicate references draw only once", async () => {
  const circuitJson = f1cVoltageMismatch.map((element) =>
    element.type === "source_component_misconfigured_error"
      ? {
          ...element,
          source_port_ids: ["missing_port", "source_port_0", "source_port_0"],
        }
      : element,
  )
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
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
