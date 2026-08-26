import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicGraphic } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { createSvgObjectFromSchematicGraphic } from "lib/sch/svg-object-fns/create-svg-object-from-sch-graphic"
import { readFileSync } from "node:fs"
import { parseSync, type INode } from "svgson"

const systemBlockDiagramSvg = readFileSync(
  new URL("./assets/system-block-diagram.svg", import.meta.url),
  "utf8",
)

test("renders raw SVG content inside a schematic sheet", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicSheet("schematic_sheet_system", 0),
      schematicGraphic({
        id: "schematic_graphic_system",
        sheetId: "schematic_sheet_system",
        svgContent: systemBlockDiagramSvg,
      }),
    ],
    { width: 1200, height: 848 },
  )

  const root = parseSync(svg)
  const graphic = findElement(root, "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(graphic.name).toBe("g")
  expect(graphic.attributes.class).toStartWith("schematic-graphic ")
  expect(graphic.attributes["data-circuit-json-type"]).toBe("schematic_graphic")
  expect(graphic.attributes["data-schematic-sheet-id"]).toBe(
    "schematic_sheet_system",
  )
  expect(nestedSvg.attributes.viewBox).toBe("0 0 800 400")
  expect(nestedSvg.attributes.preserveAspectRatio).toBe("xMidYMid meet")
  expect(Number(nestedSvg.attributes.x)).toBeGreaterThan(0)
  expect(Number(nestedSvg.attributes.y)).toBeGreaterThan(0)
  expect(Number(nestedSvg.attributes.width)).toBeLessThan(1200)
  expect(Number(nestedSvg.attributes.height)).toBeLessThan(848)

  // Definitions, references, and text remain inline, with private IDs.
  const gradient = findElementWithName(nestedSvg, "linearGradient")
  expect(gradient?.attributes.id).toStartWith(
    `${getGraphicNamespace(graphic)}--`,
  )
  expect(svg).toContain(`fill="url(#${gradient?.attributes.id})"`)
  expect(svg).toContain(">System Block Diagram</text>")
  expect(svg).not.toContain("data:image/svg+xml")
  // The graphic sits behind the sheet frame and schematic elements.
  expect(svg.indexOf('data-schematic-graphic-id="')).toBeLessThan(
    svg.indexOf('class="schematic-sheet"'),
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("schematic graphics follow schematic sheet selection", () => {
  const circuitJson = [
    schematicSheet("schematic_sheet_first", 0),
    schematicGraphic({
      id: "schematic_graphic_first",
      sheetId: "schematic_sheet_first",
      svgContent:
        '<svg viewBox="0 0 100 50"><text>FIRST PAGE DIAGRAM</text></svg>',
    }),
    schematicSheet("schematic_sheet_second", 1),
    schematicGraphic({
      id: "schematic_graphic_second",
      sheetId: "schematic_sheet_second",
      svgContent:
        '<svg viewBox="0 0 100 50"><text>SECOND PAGE DIAGRAM</text></svg>',
    }),
  ]

  const firstPageSvg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(firstPageSvg).toContain("FIRST PAGE DIAGRAM")
  expect(firstPageSvg).not.toContain("SECOND PAGE DIAGRAM")

  const secondPageSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    schematicSheetId: "schematic_sheet_second",
  })
  expect(secondPageSvg).toContain("SECOND PAGE DIAGRAM")
  expect(secondPageSvg).not.toContain("FIRST PAGE DIAGRAM")
})

test("derives a viewBox from absolute SVG dimensions", () => {
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_dimensions",
      svg_content:
        '<svg width="25.4mm" height="1in" preserveAspectRatio="xMinYMin slice"><rect width="96" height="96"/></svg>',
    },
    viewport: { x: 10, y: 20, width: 300, height: 200 },
  })
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.attributes.viewBox).toBe("0 0 96 96")
  expect(nestedSvg.attributes.preserveAspectRatio).toBe("xMinYMin slice")
  expect(nestedSvg.attributes.x).toBe("10")
  expect(nestedSvg.attributes.y).toBe("20")
  expect(nestedSvg.attributes.width).toBe("300")
  expect(nestedSvg.attributes.height).toBe("200")
})

test("uses SVG intrinsic dimension fallbacks for non-absolute lengths", () => {
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_fallback_dimensions",
      svg_content:
        '<svg width="100%" height="auto"><rect width="10" height="10"/></svg>',
    },
    viewport: { x: 0, y: 0, width: 300, height: 150 },
  })

  expect(getNestedSvg(graphic).attributes.viewBox).toBe("0 0 300 150")
})

test("source root overrides cannot escape the fitted viewport", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_root_fit",
        svgContent: `<svg viewBox="0 0 100 50" transform="translate(500 500) scale(20)"
          style="width:9999px!important;height:9999px!important;transform:translate(200px, 200px) scale(50)!important;position:fixed!important;inset:0!important">
          <style>svg { width: 9999px !important; height: 9999px !important; transform: scale(50) !important }</style>
          <rect width="50" height="50" fill="#ff0000"/>
          <rect x="50" width="50" height="50" fill="#0000ff"/>
        </svg>`,
      }),
    ],
    { width: 200, height: 100 },
  )
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.name).toBe("svg")
  expect(nestedSvg.attributes.transform).toBeUndefined()
  expect(nestedSvg.attributes.x).toBe("0")
  expect(nestedSvg.attributes.y).toBe("0")
  expect(nestedSvg.attributes.width).toBe("200")
  expect(nestedSvg.attributes.height).toBe("100")
  expect(nestedSvg.attributes.overflow).toBe("hidden")
  expect(graphic.attributes["pointer-events"]).toBe("none")
  expect(nestedSvg.attributes.style).toContain("width:200px!important")
  expect(nestedSvg.attributes.style).toContain("height:100px!important")
  expect(nestedSvg.attributes.style).toContain("transform:none!important")

  const rendered = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render()
  expect(readPixel(rendered.pixels, rendered.width, 50, 50)).toEqual([
    255, 0, 0, 255,
  ])
  expect(readPixel(rendered.pixels, rendered.width, 150, 50)).toEqual([
    0, 0, 255, 255,
  ])
})

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

  // No source ID from either graphic collides in the host document.
  expect(new Set(sourceIds).size).toBe(sourceIds.length)
})

test("namespaces source classes so host schematic styles cannot restyle them", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_class_isolation",
        svgContent: `<svg viewBox="0 0 20 10">
          <rect class="boundary text" width="20" height="10" fill="#00ff00"/>
        </svg>`,
      }),
    ],
    { width: 200, height: 100 },
  )
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const namespace = getGraphicNamespace(graphic)
  const sourceRect = findElementWithName(getNestedSvg(graphic), "rect")

  expect(sourceRect?.attributes.class).toBe(
    `${namespace}--class-626f756e64617279 ${namespace}--class-74657874`,
  )

  const pixels = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render().pixels
  let greenPixelCount = 0
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (
      (pixels[offset] ?? 0) < 20 &&
      (pixels[offset + 1] ?? 0) > 230 &&
      (pixels[offset + 2] ?? 0) < 20 &&
      (pixels[offset + 3] ?? 0) > 230
    ) {
      greenPixelCount += 1
    }
  }
  expect(greenPixelCount).toBeGreaterThan(10_000)
})

test("preserves embedded static raster images but strips active and external images", () => {
  const pngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_embedded_images",
      svg_content: `<svg viewBox="0 0 10 10">
        <image id="safe" href="${pngDataUrl}"/>
        <image id="external" href="https://example.com/logo.png"/>
        <image id="active" href="data:image/svg+xml;base64,PHN2Zy8+"/>
        <image id="animated" href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="/>
      </svg>`,
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })
  const nestedSvg = getNestedSvg(graphic)
  const hrefs = collectAttributeValues(nestedSvg, "href")

  expect(hrefs).toEqual([pngDataUrl])
  expect(stringifyTree(nestedSvg)).not.toContain("https://example.com")
  expect(stringifyTree(nestedSvg)).not.toContain("data:image/svg+xml")
  expect(stringifyTree(nestedSvg)).not.toContain("data:image/gif")
})

test("drops malformed embedded CSS without rejecting the SVG", () => {
  const graphic = createSvgObjectFromSchematicGraphic({
    schematicGraphic: {
      type: "schematic_graphic",
      schematic_graphic_id: "schematic_graphic_bad_css",
      svg_content: `<svg viewBox="0 0 10 10">
        <style>.broken { fill: red</style>
        <rect width="10" height="10" style="fill:red;} .boundary {display:none"/>
      </svg>`,
    },
    viewport: { x: 0, y: 0, width: 100, height: 100 },
  })
  const nestedSvg = getNestedSvg(graphic)

  expect(findElementWithName(nestedSvg, "rect")).toBeDefined()
  expect(findElementWithName(nestedSvg, "style")).toBeUndefined()
  expect(
    findElementWithName(nestedSvg, "rect")?.attributes.style,
  ).toBeUndefined()
})

test("a schematic graphic without an explicit sheet fills the output viewport", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_standalone",
        svgContent:
          '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>',
      }),
    ],
    { width: 320, height: 180 },
  )

  const root = parseSync(svg)
  const graphic = findElement(root, "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.attributes.x).toBe("0")
  expect(nestedSvg.attributes.y).toBe("0")
  expect(nestedSvg.attributes.width).toBe("320")
  expect(nestedSvg.attributes.height).toBe("180")
})

test("schematic graphics render behind debug objects", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    schematicGraphic({
      id: "schematic_graphic_layering",
      svgContent:
        '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="white"/></svg>',
    }),
    {
      type: "schematic_debug_object",
      shape: "rect",
      center: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      label: "DEBUG ABOVE GRAPHIC",
    } as AnyCircuitElement,
  ])

  expect(svg.indexOf('data-schematic-graphic-id="')).toBeLessThan(
    svg.indexOf("DEBUG ABOVE GRAPHIC"),
  )
})

test("reports which schematic graphic contains invalid SVG", () => {
  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_invalid",
        svg_content: "not an svg document",
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_invalid": svg_content is not valid SVG',
  )

  expect(() =>
    createSvgObjectFromSchematicGraphic({
      schematicGraphic: {
        type: "schematic_graphic",
        schematic_graphic_id: "schematic_graphic_wrong_root",
        svg_content: "<g><rect/></g>",
      },
      viewport: { x: 0, y: 0, width: 100, height: 100 },
    }),
  ).toThrow(
    'Unable to render schematic graphic "schematic_graphic_wrong_root": svg_content is not valid SVG',
  )
})

function schematicSheet(id: string, sheetIndex: number): AnyCircuitElement {
  return {
    type: "schematic_sheet",
    schematic_sheet_id: id,
    sheet_index: sheetIndex,
  } as AnyCircuitElement
}

function schematicGraphic({
  id,
  sheetId,
  svgContent,
}: {
  id: string
  sheetId?: string
  svgContent: string
}): SchematicGraphic {
  return {
    type: "schematic_graphic",
    schematic_graphic_id: id,
    ...(sheetId ? { schematic_sheet_id: sheetId } : {}),
    svg_content: svgContent,
  }
}

function findElement(node: INode, attributeName: string): INode | undefined {
  if (node.attributes[attributeName] !== undefined) return node

  for (const child of node.children) {
    const match = findElement(child, attributeName)
    if (match) return match
  }

  return undefined
}

function findElements(node: INode, attributeName: string): INode[] {
  return [
    ...(node.attributes[attributeName] !== undefined ? [node] : []),
    ...node.children.flatMap((child) => findElements(child, attributeName)),
  ]
}

function findElementWithName(node: INode, name: string): INode | undefined {
  if (node.name === name) return node
  for (const child of node.children) {
    const match = findElementWithName(child, name)
    if (match) return match
  }
  return undefined
}

function getNestedSvg(graphic: INode): INode {
  const nestedSvg = graphic.children.find((child) => child.name === "svg")
  if (!nestedSvg)
    throw new Error("Expected schematic graphic to contain an SVG")
  return nestedSvg
}

function getGraphicNamespace(graphic: INode): string {
  const namespace = graphic.attributes.class
    ?.split(/\s+/)
    .find((className) => className !== "schematic-graphic")
  if (!namespace) throw new Error("Expected schematic graphic namespace class")
  return namespace
}

function collectAttributeValues(node: INode, attributeName: string): string[] {
  return [
    ...(node.attributes[attributeName]
      ? [node.attributes[attributeName]!]
      : []),
    ...node.children.flatMap((child) =>
      collectAttributeValues(child, attributeName),
    ),
  ]
}

function collectTextFromElements(node: INode, elementName: string): string {
  return [
    ...(node.name === elementName ? [getNodeText(node)] : []),
    ...node.children.map((child) =>
      collectTextFromElements(child, elementName),
    ),
  ].join("")
}

function getNodeText(node: INode): string {
  return [
    ...(node.type === "text" ? [node.value] : []),
    ...node.children.map(getNodeText),
  ].join("")
}

function stringifyTree(node: INode): string {
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
  return `<${node.name}${attributes ? ` ${attributes}` : ""}>${node.children
    .map(stringifyTree)
    .join("")}</${node.name}>`
}

function readPixel(
  pixels: Buffer,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const offset = (y * width + x) * 4
  return [
    pixels[offset] ?? 0,
    pixels[offset + 1] ?? 0,
    pixels[offset + 2] ?? 0,
    pixels[offset + 3] ?? 0,
  ]
}
