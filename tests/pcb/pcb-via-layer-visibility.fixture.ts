import type { AnyCircuitElement, LayerRef, PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { type INode, parseSync } from "svgson"

const viewWidth = 800
const viewHeight = 300
const viewport = { minX: -8, maxX: 8, minY: -3, maxY: 3 }

export const vias: PcbVia[] = [
  {
    type: "pcb_via",
    pcb_via_id: "through",
    subcircuit_id: "board",
    x: -4.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1", "inner2", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "top_blind",
    subcircuit_id: "board",
    x: -1.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1", "inner2"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "buried",
    subcircuit_id: "board",
    x: 1.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner1", "inner2"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "bottom_blind",
    subcircuit_id: "board",
    x: 4.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner2", "bottom"],
  },
]

export const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    subcircuit_id: "board",
    center: { x: 0, y: 0 },
    width: 16,
    height: 6,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  },
  ...vias,
  ...vias.map(
    (via): AnyCircuitElement => ({
      type: "pcb_note_text",
      pcb_note_text_id: `${via.pcb_via_id}_label`,
      font: "tscircuit2024",
      layer: "top",
      anchor_position: { x: via.x, y: 1.2 },
      anchor_alignment: "center",
      font_size: 0.35,
      text: via.pcb_via_id.replaceAll("_", " "),
    }),
  ),
  ...vias.map(
    (via): AnyCircuitElement => ({
      type: "pcb_note_text",
      pcb_note_text_id: `${via.pcb_via_id}_layers`,
      font: "tscircuit2024",
      layer: "top",
      anchor_position: { x: via.x, y: -1.5 },
      anchor_alignment: "center",
      font_size: 0.3,
      text: via.layers.join("\n"),
    }),
  ),
]

export function renderViaLayerView(layer?: LayerRef): string {
  return convertCircuitJsonToPcbSvg(
    [
      ...circuit,
      {
        type: "pcb_note_text",
        pcb_note_text_id: "view_label",
        font: "tscircuit2024",
        layer: "top",
        anchor_position: { x: 0, y: 2.5 },
        anchor_alignment: "center",
        font_size: 0.45,
        text: `Copper view: ${layer ?? "all layers"}`,
      },
    ],
    {
      layer,
      width: viewWidth,
      height: viewHeight,
      viewport,
    },
  )
}

const getRenderedViaXs = (svg: string): number[] => {
  const xs: number[] = []
  const visit = (node: INode) => {
    if (
      node.name === "circle" &&
      node.attributes.class === "pcb-hole-outer" &&
      node.attributes["data-type"] === "pcb_via"
    ) {
      xs.push(Number(node.attributes.cx))
    }
    node.children.forEach(visit)
  }
  visit(parseSync(svg))
  return xs.sort((a, b) => a - b)
}

export function renderViaLayerStack(): string {
  const layers: (LayerRef | undefined)[] = [
    "top",
    "inner1",
    "inner2",
    "bottom",
    undefined,
  ]
  const views = layers.map((layer) => ({
    layer,
    svg: renderViaLayerView(layer),
  }))
  const passing = views.every(({ layer, svg }) => {
    const expectedXs = vias
      .filter((via) => !layer || via.layers.includes(layer))
      .map(
        (via) =>
          ((via.x - viewport.minX) * viewWidth) /
          (viewport.maxX - viewport.minX),
      )
      .sort((a, b) => a - b)
    return getRenderedViaXs(svg).join(",") === expectedXs.join(",")
  })
  const headerHeight = 100
  const gap = 16
  const height =
    headerHeight + views.length * viewHeight + (views.length - 1) * gap
  const panels = views
    .map(
      ({ svg }, index) =>
        `<g transform="translate(0, ${headerHeight + index * (viewHeight + gap)})">${svg}</g>`,
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="${height}" viewBox="0 0 ${viewWidth} ${height}">
    <rect width="${viewWidth}" height="${height}" fill="#000" />
    <rect width="${viewWidth}" height="${headerHeight}" fill="#141414" />
    <text x="${viewWidth / 2}" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${passing ? "#4ade80" : "#fb7185"}">Repro: ${passing ? "PASSING" : "FAILING"}</text>
    <text x="${viewWidth / 2}" y="64" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#f4f4f4">PCB views must show vias only on their physical copper layers.</text>
    <text x="${viewWidth / 2}" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#a3a3a3">Compare the rendered vias with their listed layers in each view below.</text>
    ${panels}
  </svg>`
}
