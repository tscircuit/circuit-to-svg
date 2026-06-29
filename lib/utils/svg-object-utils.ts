import type { SvgObject } from "lib/svg-object"

/** Assert a parsed svgson node is an element node (e.g. an `<svg>` root). */
export function ensureElementNode(node: SvgObject): SvgObject {
  if (node.type !== "element") {
    throw new Error("Expected SVG root element to be of type 'element'")
  }
  return node
}

/** Deep clone an svgson node so it can be mutated without affecting the source. */
export function cloneSvgObject(node: SvgObject): SvgObject {
  return {
    ...node,
    attributes: { ...(node.attributes ?? {}) },
    children: node.children?.map(cloneSvgObject) ?? [],
  }
}

/**
 * Position a parsed `<svg>` node as a nested svg at (x, y) with the given size.
 * The `xmlns` attribute is dropped because nested svgs inherit it from the
 * parent document.
 */
export function translateNestedSvg(
  node: SvgObject,
  x: number,
  y: number,
  width: number,
  height: number,
): SvgObject {
  const clone = cloneSvgObject(node)
  clone.attributes = {
    ...clone.attributes,
    x: formatNumber(x),
    y: formatNumber(y),
    width: formatNumber(width),
    height: formatNumber(height),
  }

  delete clone.attributes.xmlns
  return clone
}

/** Format a number for an SVG attribute, rounding away floating point noise. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return Number.parseFloat(value.toFixed(6)).toString()
}
