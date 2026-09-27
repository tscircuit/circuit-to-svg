import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { INode } from "svgson"
import { parseSync } from "svgson"

const board = {
  type: "pcb_board",
  pcb_board_id: "non_finite_board",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  material: "fr4",
  thickness: 1.6,
  num_layers: 2,
} as AnyCircuitElement

function findNode(
  node: INode,
  matches: (node: INode) => boolean,
): INode | undefined {
  if (matches(node)) return node
  for (const child of node.children) {
    const match = findNode(child, matches)
    if (match) return match
  }
  return undefined
}

function renderText(
  fontSize: number | undefined,
  text: string,
  knockout = false,
) {
  const element = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "non_finite_text",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    layer: "top",
    text,
    font_size: fontSize,
    is_knockout: knockout,
  } as AnyCircuitElement
  return parseSync(convertCircuitJsonToPcbSvg([board, element]))
}

function renderKeepout(radius: number) {
  const element = {
    type: "pcb_keepout",
    pcb_keepout_id: "non_finite_keepout",
    center: { x: 0, y: 0 },
    shape: "circle",
    layers: ["top"],
    radius,
  } as AnyCircuitElement
  return parseSync(convertCircuitJsonToPcbSvg([board, element]))
}

function renderedText(root: INode): INode {
  const node = findNode(
    root,
    (node) =>
      node.name === "text" &&
      node.attributes["data-pcb-silkscreen-text-id"] === "non_finite_text",
  )
  expect(node).toBeDefined()
  if (!node) throw new Error("silkscreen text was not rendered")
  return node
}

function renderedKeepout(root: INode): INode[] {
  const nodes: INode[] = []
  const visit = (node: INode) => {
    if (
      node.name === "circle" &&
      node.attributes["data-pcb-keepout-id"] === "non_finite_keepout"
    ) {
      nodes.push(node)
    }
    node.children.forEach(visit)
  }
  visit(root)
  expect(nodes).toHaveLength(2)
  return nodes
}

for (const nonFinite of [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
]) {
  test(`ordinary silkscreen text defaults non-finite font size ${nonFinite}`, () => {
    const expected = renderedText(renderText(1, "hi"))
    const actual = renderedText(renderText(nonFinite, "hi"))
    expect(actual.attributes["font-size"]).toBe(
      expected.attributes["font-size"],
    )
    expect(actual.attributes["font-size"]).not.toContain("NaN")
    expect(actual.attributes["font-size"]).not.toContain("Infinity")
  })

  test(`multiline silkscreen text uses the same fallback for font and line spacing ${nonFinite}`, () => {
    const expected = renderedText(renderText(1, "first\nsecond"))
    const actual = renderedText(renderText(nonFinite, "first\nsecond"))
    expect(actual.attributes["font-size"]).toBe(
      expected.attributes["font-size"],
    )
    const expectedLines = expected.children.filter(
      (node) => node.name === "tspan",
    )
    const actualLines = actual.children.filter((node) => node.name === "tspan")
    expect(actualLines).toHaveLength(2)
    expect(actualLines[1]?.attributes.dy).toBe(expectedLines[1]?.attributes.dy)
  })

  test(`knockout silkscreen text with non-finite font size stays rendered ${nonFinite}`, () => {
    const expected = renderText(1, "CUTOUT", true)
    const actual = renderText(nonFinite, "CUTOUT", true)
    const isKnockout = (node: INode) =>
      node.name === "rect" &&
      node.attributes.class?.includes("pcb-silkscreen-text-knockout") === true
    const expectedRect = findNode(expected, isKnockout)
    const actualRect = findNode(actual, isKnockout)
    expect(actualRect).toBeDefined()
    for (const attribute of ["x", "y", "width", "height", "transform"]) {
      expect(actualRect?.attributes[attribute]).toBe(
        expectedRect?.attributes[attribute],
      )
    }
    const maskRect = findNode(
      actual,
      (node) =>
        node.name === "rect" &&
        node.attributes.fill === "white" &&
        node.attributes.width !== undefined,
    )
    expect(maskRect).toBeDefined()
    for (const attribute of ["x", "y", "width", "height"]) {
      expect(Number.isFinite(Number(maskRect?.attributes[attribute]))).toBe(
        true,
      )
    }
  })

  test(`circular keepout defaults non-finite radius ${nonFinite}`, () => {
    const expected = renderedKeepout(renderKeepout(0))
    const actual = renderedKeepout(renderKeepout(nonFinite))
    expect(actual.map((node) => node.attributes.r)).toEqual(
      expected.map((node) => node.attributes.r),
    )
  })
}

test("finite silkscreen sizes, including zero, retain their rendered values", () => {
  const unitSize = Number(
    renderedText(renderText(1, "hi")).attributes["font-size"],
  )
  for (const fontSize of [0, 0.75]) {
    const actual = renderedText(renderText(fontSize, "hi"))
    expect(Number(actual.attributes["font-size"])).toBe(fontSize * unitSize)
  }
})

test("finite circular keepout radii, including zero, retain their rendered values", () => {
  const unitRadius = Number(renderedKeepout(renderKeepout(1))[0]?.attributes.r)
  for (const radius of [0, 2.5]) {
    const actual = renderedKeepout(renderKeepout(radius))
    expect(actual.map((node) => Number(node.attributes.r))).toEqual([
      radius * unitRadius,
      radius * unitRadius,
    ])
  }
})
