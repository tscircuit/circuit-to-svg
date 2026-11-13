import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { type INode, parseSync } from "svgson"

// SVG shapes like <rect> and <line> cannot have rendered children, so a
// <text> nested inside them is never painted.
const findTextParents = (node: INode, label: string, parent?: INode) => {
  const parents: string[] = []
  if (
    node.name === "text" &&
    node.children.some((child) => child.value === label)
  ) {
    parents.push(parent?.name ?? "")
  }
  for (const child of node.children) {
    parents.push(...findTextParents(child, label, node))
  }
  return parents
}

test("schematic debug object labels are rendered outside of shape elements", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_debug_object",
      shape: "rect",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 1 },
      label: "Debug Box",
    },
    {
      type: "schematic_debug_object",
      shape: "line",
      start: { x: -1, y: 1 },
      end: { x: 1, y: 2 },
      label: "Debug Line",
    },
  ])
  const root = parseSync(svg)

  for (const label of ["Debug Box", "Debug Line"]) {
    const parents = findTextParents(root, label)
    expect(parents).toHaveLength(1)
    expect(["g", "svg"]).toContain(parents[0]!)
  }
})
