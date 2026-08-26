import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  collectAttributeValues,
  collectTextFromElements,
  findElement,
  findElements,
  findElementWithName,
  getNestedSvg,
  readPixel,
  schematicGraphic,
  stringifyTree,
} from "./schematic-graphic-test-helpers"

test("schematic graphics cannot restore pointer, focus, or hash navigation", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_interaction_sanitizer",
        svgContent: `<svg viewBox="0 0 100 50">
          <style>
            #linked-child { all: initial; pointer-events: auto; fill: #00ff00 }
          </style>
          <defs><rect id="reference" width="5" height="5" /></defs>
          <a href="#reference" tabindex="0" focusable="true" autofocus="autofocus">
            <rect id="linked-child" x="10" y="10" width="30" height="30"
              fill="#00ff00" tabindex="-1" focusable="true" autofocus="autofocus"
              pointer-events="auto" style="all:initial;pointer-events:auto;fill:#00ff00" />
          </a>
          <use href="#reference" x="80" y="20" fill="#0000ff" />
        </svg>`,
      }),
    ],
    { width: 100, height: 50 },
  )
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)
  const nestedMarkup = stringifyTree(nestedSvg)

  expect(findElementWithName(nestedSvg, "a")).toBeUndefined()
  expect(
    findElements(nestedSvg, "id").find(
      (element) =>
        element.name === "rect" &&
        element.attributes.x === "10" &&
        element.attributes.y === "10",
    ),
  ).toBeDefined()
  expect(collectAttributeValues(nestedSvg, "tabindex")).toEqual([])
  expect(collectAttributeValues(nestedSvg, "focusable")).toEqual([])
  expect(collectAttributeValues(nestedSvg, "autofocus")).toEqual([])
  expect(collectAttributeValues(nestedSvg, "pointer-events")).toEqual([])
  expect(graphic.attributes["pointer-events"]).toBe("none")
  expect(nestedMarkup).not.toMatch(/(?:^|[;{])\s*all\s*:/i)
  expect(nestedMarkup).not.toMatch(/pointer-events\s*:/i)
  const sanitizedCss = collectTextFromElements(nestedSvg, "style")
  expect(sanitizedCss).toContain("fill: #00ff00")
  expect(sanitizedCss).not.toMatch(/(?:^|[;{])\s*all\s*:/i)
  expect(sanitizedCss).not.toMatch(/pointer-events\s*:/i)

  const hrefs = collectAttributeValues(nestedSvg, "href")
  expect(hrefs).toHaveLength(1)
  expect(findElementWithName(nestedSvg, "use")?.attributes.href).toBe(hrefs[0])
  expect(hrefs[0]).toMatch(/^#schematic-graphic-.+--/)

  const rendered = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render()
  expect(readPixel(rendered.pixels, rendered.width, 20, 20)).toEqual([
    0, 255, 0, 255,
  ])
})
