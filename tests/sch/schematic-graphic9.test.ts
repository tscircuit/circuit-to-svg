import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  collectAttributeValues,
  collectTextFromElements,
  findElements,
  findElementWithName,
  getGraphicNamespace,
  getNestedSvg,
  schematicGraphic,
  schematicSheet,
  stringifyTree,
} from "./schematic-graphic-test-helpers"

test("sanitizes active content and namespaces repeated IDs and CSS", () => {
  const hostileSvg = `<svg viewBox="0 0 20 10" onload="alert('event')" xml:base="https://example.com/base/">
    <style>
      @import url("https://example.com/global.css");
      @font-face { font-family: hostile; src: url("https://example.com/font.woff2") }
      @keyframes mutate { to { opacity: 0 } }
      :root .boundary, #shared-shape { display: none; fill: url(#shared-paint) }
      .external { fill: url("https://example.com/paint.svg#red") }
      .escaped { fill: u\\72l(https://example.com/escaped.svg) }
      .escaped-property { a\\6eimation-name: mutate }
      .variable { --paint: url(https://example.com/variable.svg); fill: var(--paint) }
    </style>
    <defs>
      <linearGradient id="shared-paint"><stop offset="0" stop-color="red"/></linearGradient>
    </defs>
    <script>alert('script')</script>
    <foreignObject><div onload="alert('foreign')">unsafe</div></foreignObject>
    <handler>unsafe handler</handler>
    <listener event="load" handler="#shared-shape"/>
    <rect id="shared-shape" class="boundary" width="20" height="10"
      fill="url(#shared-paint)" onmouseover="alert('event')"
      style="stroke:url(#shared-paint);background:url(https://example.com/bg.png);fill:blue"/>
    <use href="#shared-shape"/>
    <a href="javascript:alert('link')"><text>link text remains static</text></a>
    <image href="https://example.com/tracker.svg"/>
    <path fill="u\\72l(https://example.com/escaped-attribute.svg)" pointer-events="auto"/>
    <animate attributeName="opacity" values="0;1" dur="1s"/>
    <set attributeName="display" to="none"/>
  </svg>`
  const outputSvg = convertCircuitJsonToSchematicSvg([
    schematicSheet("schematic_sheet_isolation", 0),
    schematicGraphic({
      id: "schematic_graphic_isolation_1",
      sheetId: "schematic_sheet_isolation",
      svgContent: hostileSvg,
    }),
    schematicGraphic({
      id: "schematic_graphic_isolation_2",
      sheetId: "schematic_sheet_isolation",
      svgContent: hostileSvg,
    }),
  ])

  expect(outputSvg).not.toContain("<script")
  expect(outputSvg).not.toContain("<foreignObject")
  expect(outputSvg).not.toContain("<handler")
  expect(outputSvg).not.toContain("<listener")
  expect(outputSvg).not.toContain("<animate")
  expect(outputSvg).not.toContain("<set")
  expect(outputSvg).not.toContain("onload=")
  expect(outputSvg).not.toContain("onmouseover=")
  expect(outputSvg).not.toContain("javascript:")
  expect(outputSvg).not.toContain("https://example.com")
  expect(outputSvg).not.toContain("@import")
  expect(outputSvg).not.toContain("@font-face")
  expect(outputSvg).not.toContain("@keyframes")
  expect(outputSvg).not.toContain("var(--paint)")
  expect(outputSvg).not.toContain("u\\72l")
  expect(outputSvg).toContain("link text remains static")

  const root = parseSync(outputSvg)
  const graphics = findElements(root, "data-schematic-graphic-id")
  expect(graphics).toHaveLength(2)
  expect(getGraphicNamespace(graphics[0]!)).not.toBe(
    getGraphicNamespace(graphics[1]!),
  )

  const sourceIds: string[] = []
  for (const graphic of graphics) {
    const namespace = getGraphicNamespace(graphic)
    const nestedSvg = getNestedSvg(graphic)
    const ids = collectAttributeValues(nestedSvg, "id")
    sourceIds.push(...ids)

    expect(ids).toHaveLength(2)
    expect(ids.every((id) => id.startsWith(`${namespace}--`))).toBeTrue()
    const paintId = findElementWithName(nestedSvg, "linearGradient")?.attributes
      .id
    const shapeId = findElementWithName(nestedSvg, "rect")?.attributes.id
    expect(paintId).toBeDefined()
    expect(shapeId).toBeDefined()
    expect(stringifyTree(nestedSvg)).toContain(`fill="url(#${paintId})"`)
    expect(stringifyTree(nestedSvg)).toContain(`href="#${shapeId}"`)

    const scopedCss = collectTextFromElements(nestedSvg, "style")
    expect(scopedCss).toContain(
      `.${namespace} svg .${namespace}--class-626f756e64617279`,
    )
    expect(scopedCss).toContain(`#${shapeId}`)
    expect(scopedCss).toContain(`url(#${paintId})`)
  }

  expect(new Set(sourceIds).size).toBe(sourceIds.length)
})
