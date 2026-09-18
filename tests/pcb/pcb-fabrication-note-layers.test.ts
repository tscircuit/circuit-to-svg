import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { type INode, parseSync } from "svgson"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  ...(["top", "bottom"] as const).map((layer) => ({
    type: "pcb_fabrication_note_path" as const,
    pcb_fabrication_note_path_id: `${layer}-path`,
    pcb_component_id: "component",
    layer,
    route: [
      { x: -4, y: layer === "top" ? 3 : -3 },
      { x: 4, y: layer === "top" ? 3 : -3 },
    ],
    stroke_width: 0.2,
  })),
]

function fabricationPathIds(node: INode): string[] {
  const id = node.attributes["data-pcb-fabrication-note-path-id"]
  return [...(id ? [id] : []), ...node.children.flatMap(fabricationPathIds)]
}

for (const [layer, expected] of [
  ["top", ["top-path"]],
  ["bottom", ["bottom-path"]],
  [undefined, ["top-path", "bottom-path"]],
] as const) {
  test(`fabrication paths respect the ${layer ?? "unfiltered"} board view`, () => {
    const svg = convertCircuitJsonToPcbSvg(circuit, {
      layer,
      showPcbNotes: false,
    })
    expect(fabricationPathIds(parseSync(svg))).toEqual([...expected])
  })
}
