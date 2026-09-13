import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { type INode, parseSync } from "svgson"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const fabricationNotes: AnyCircuitElement[] = [
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "fab-path",
    pcb_component_id: "component",
    layer: "top",
    route: [
      { x: -4, y: 3 },
      { x: 4, y: 3 },
    ],
    stroke_width: 0.2,
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab-text",
    pcb_component_id: "component",
    layer: "top",
    text: "FAB",
    anchor_position: { x: 0, y: 1 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "fab-rect",
    pcb_component_id: "component",
    layer: "top",
    center: { x: 0, y: -2 },
    width: 4,
    height: 2,
    stroke_width: 0.2,
  },
  {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "fab-dimension",
    pcb_component_id: "component",
    layer: "top",
    from: { x: -4, y: -5 },
    to: { x: 4, y: -5 },
    text: "8 mm",
    font: "tscircuit2024",
    font_size: 1,
    arrow_size: 0.4,
    offset_distance: 0.5,
    offset_direction: { x: 0, y: -1 },
  },
]

const silkscreen: AnyCircuitElement = {
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: "reference",
  pcb_component_id: "component",
  layer: "top",
  text: "U1",
  anchor_position: { x: 0, y: 6 },
  anchor_alignment: "center",
  font: "tscircuit2024",
  font_size: 1,
  ccw_rotation: 0,
}

function fabricationNodes(svg: string): INode[] {
  const visit = (node: INode): INode[] => [
    ...(node.attributes["data-type"]?.startsWith("pcb_fabrication_note_")
      ? [node]
      : []),
    ...node.children.flatMap(visit),
  ]
  return visit(parseSync(svg))
}

test("hiding PCB notes removes every fabrication annotation and keeps silkscreen", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [board, ...fabricationNotes, silkscreen],
    {
      layer: "top",
      showPcbNotes: false,
    },
  )

  expect(fabricationNodes(svg)).toHaveLength(0)
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain("U1")
})

test("enabled fabrication paths appear only on their own board face", () => {
  const topPath = fabricationNotes.find(
    (note) => note.type === "pcb_fabrication_note_path",
  )!
  const bottomPath = {
    ...topPath,
    pcb_fabrication_note_path_id: "bottom-fab-path",
    layer: "bottom" as const,
    route: [
      { x: -4, y: -3 },
      { x: 4, y: -3 },
    ],
  }
  const circuit = [board, topPath, bottomPath]
  const topSvg = convertCircuitJsonToPcbSvg(circuit, {
    layer: "top",
    showPcbNotes: true,
  })
  const bottomSvg = convertCircuitJsonToPcbSvg(circuit, {
    layer: "bottom",
    showPcbNotes: true,
  })

  expect(
    fabricationNodes(topSvg).map(
      (node) => node.attributes["data-pcb-fabrication-note-path-id"],
    ),
  ).toEqual(["fab-path"])
  expect(
    fabricationNodes(bottomSvg).map(
      (node) => node.attributes["data-pcb-fabrication-note-path-id"],
    ),
  ).toEqual(["bottom-fab-path"])
})
