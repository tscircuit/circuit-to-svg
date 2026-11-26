import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import {
  fabricationTextBoard,
  fabricationTextCircuit,
  fabricationTextNotes,
} from "./fabrication-text-rotation-board"

const width = 1800
const scale = width / fabricationTextBoard.width!
const xSvg = (x: number) => (x + 50) * scale
const ySvg = (y: number) => (32 - y) * scale

/** Put independent input captions and anchor markers on the board texture. */
export function renderFabricationTextBoardSvg(fromBottom = false): string {
  const svg = convertCircuitJsonToPcbSvg(fabricationTextCircuit, {
    layer: "bottom",
    width,
    matchBoardAspectRatio: true,
    drawPaddingOutsideBoard: false,
    viewport: { minX: -50, minY: -32, maxX: 50, maxY: 32 },
    backgroundColor: "#14583e",
    showFabricationNotes: true,
    includeVersion: false,
  })
  const annotations = fabricationTextNotes
    .map((note) => {
      const { x, y } = note.anchor_position
      const bounds = getComprehensivePcbBounds([note])
      const lines = [
        '{"text":"R2 bottom",',
        `"layer":"bottom","ccw_rotation":${note.ccw_rotation},`,
        `"anchor_alignment":"${note.anchor_alignment}",`,
        `"anchor_position":{"x":${x},"y":${y}}}`,
      ]
      return `<g>
      <path d="M ${xSvg(x - 7)} ${ySvg(y)} H ${xSvg(x + 7)} M ${xSvg(x)} ${ySvg(y - 7)} V ${ySvg(y + 7)}" stroke="#66977e" stroke-width="1"/>
      <rect x="${xSvg(bounds.minX)}" y="${ySvg(bounds.maxY)}" width="${(bounds.maxX - bounds.minX) * scale}" height="${(bounds.maxY - bounds.minY) * scale}" fill="none" stroke="#62dfff" stroke-width="1.5"/>
      <g transform="translate(${xSvg(x)} ${ySvg(y)})" stroke="#ffb62e" fill="none" stroke-width="2">
        <path d="M -9 0 H 9 M 0 -9 V 9"/><circle r="3"/>
      </g>
      <g transform="translate(${xSvg(x + 10.5)} ${ySvg(y + 11)}) scale(-1 1)" font-family="TscircuitAlphabet" font-size="17" fill="#b4eaff">
        ${lines.map((line, index) => `<text x="0" y="${index * 20}">${line}</text>`).join("")}
      </g>
    </g>`
    })
    .join("")
  const heading = `<g transform="translate(${width - 30} 36) scale(-1 1)" font-family="TscircuitAlphabet" fill="#ffffff">
    <text font-size="23">Bottom FAB: centered anchors / top-left anchors</text>
    <text y="32" font-size="17">Amber = input anchor; cyan = calculated text bounds. Coordinates in mm.</text>
  </g>`
  const annotated = svg.replace("</svg>", `${heading}${annotations}</svg>`)
  if (!fromBottom) return annotated
  // The texture uses PCB coordinates. Flip the whole view to look from below.
  return annotated
    .replace(
      /(<svg[^>]*>)/,
      `$1<g transform="translate(${width} 0) scale(-1 1)">`,
    )
    .replace("</svg>", "</g></svg>")
}
