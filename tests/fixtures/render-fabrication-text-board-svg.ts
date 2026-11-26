import { convertCircuitJsonToPcbSvg } from "lib"
import nativeReference from "./kicad-fabrication-reference.json"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import {
  fabricationTextBoard,
  fabricationTextNotes,
} from "./fabrication-text-board"

const width = 1800
const scale = width / fabricationTextBoard.width!
const xSvg = (x: number) => (x + 50) * scale
const ySvg = (y: number) => (32 - y) * scale

/** Show input captions and independent anchor markers on the bottom SVG. */
export function renderFabricationTextBoardSvg({
  layer = "bottom",
  view = "bottom",
}: { layer?: "top" | "bottom"; view?: "top" | "bottom" } = {}): string {
  const fromBottom = view === "bottom"
  const annotationScale = fromBottom ? -1 : 1
  const labelOffset = annotationScale
  const notes = fabricationTextNotes.map((note) => ({ ...note, layer }))
  const title =
    layer === "top"
      ? "TOP layer, viewed from ABOVE"
      : fromBottom
        ? "BOTTOM layer, viewed from BELOW"
        : "BOTTOM layer, viewed from ABOVE (mirrored glyphs)"
  const svg = convertCircuitJsonToPcbSvg([fabricationTextBoard, ...notes], {
    layer,
    width,
    matchBoardAspectRatio: true,
    drawPaddingOutsideBoard: false,
    viewport: { minX: -50, minY: -32, maxX: 50, maxY: 32 },
    backgroundColor: "#14583e",
    showFabricationNotes: true,
    includeVersion: false,
  })
  const annotations = notes
    .map((note) => {
      const { x, y } = note.anchor_position
      const bounds = getComprehensivePcbBounds([note])
      const lines = [
        '{"text":"R2 bottom",',
        `"layer":"${layer}","ccw_rotation":${note.ccw_rotation},`,
        `"anchor_alignment":"${note.anchor_alignment}",`,
        `"anchor_position":{"x":${x},"y":${y}}}`,
      ]
      const basis =
        nativeReference.views[layer === "top" ? "top" : "bottom"][
          nativeReference.board_angles.indexOf(note.ccw_rotation!)
        ]!
      const expectedAngle =
        ((Math.atan2(-basis[1]!, basis[0]!) * 180) / Math.PI + 360) % 360
      const viewCaption =
        layer === "bottom" && !fromBottom
          ? "Mirrored glyphs seen from above"
          : `Expected (KiCad): ${expectedAngle} deg CCW`
      return `<g>
      <rect x="${xSvg(bounds.minX)}" y="${ySvg(bounds.maxY)}" width="${(bounds.maxX - bounds.minX) * scale}" height="${(bounds.maxY - bounds.minY) * scale}" fill="none" stroke="#62dfff" stroke-width="1.5"/>
      <g transform="translate(${xSvg(x)} ${ySvg(y)})" stroke="#ffb62e" fill="none" stroke-width="2">
        <path d="M -9 0 H 9 M 0 -9 V 9"/><circle r="3"/>
      </g>
      <g transform="translate(${xSvg(x - annotationScale * 10.5)} ${ySvg(y + 11)}) scale(${annotationScale} 1)" font-family="TscircuitAlphabet" font-size="17" fill="#b4eaff">
        ${lines.map((line, index) => `<text x="0" y="${index * 20}">${line}</text>`).join("")}
        <text x="0" y="82" fill="#ffffff">${viewCaption}</text>
      </g>
    </g>`
    })
    .join("")
  // One shared board coordinate frame; anchor markers are not local origins.
  const axes = `<g stroke="#c1d9ce" stroke-width="1.5" fill="none">
    <path d="M ${xSvg(-46)} ${ySvg(0)} H ${xSvg(46)} M ${xSvg(0)} ${ySvg(-28)} V ${ySvg(23)}"/>
    <path d="M ${xSvg(46) - 8} ${ySvg(0) - 5} L ${xSvg(46)} ${ySvg(0)} L ${xSvg(46) - 8} ${ySvg(0) + 5} M ${xSvg(0) - 5} ${ySvg(23) + 8} L ${xSvg(0)} ${ySvg(23)} L ${xSvg(0) + 5} ${ySvg(23) + 8}"/>
    <circle cx="${xSvg(0)}" cy="${ySvg(0)}" r="4" fill="#c1d9ce"/>
    ${[-36, -12, 12, 36].map((x) => `<path d="M ${xSvg(x)} ${ySvg(0) - 5} V ${ySvg(0) + 5}"/><text transform="translate(${xSvg(x)} ${ySvg(0) + 26}) scale(${annotationScale} 1)" text-anchor="middle" stroke="none" fill="#c1d9ce" font-family="TscircuitAlphabet" font-size="17">${x}</text>`).join("")}
    ${[10, -16].map((y) => `<path d="M ${xSvg(0) - 5} ${ySvg(y)} H ${xSvg(0) + 5}"/><text transform="translate(${xSvg(labelOffset)} ${ySvg(y) + 6}) scale(${annotationScale} 1)" stroke="none" fill="#c1d9ce" font-family="TscircuitAlphabet" font-size="17">${y}</text>`).join("")}
  </g>
  <g font-family="TscircuitAlphabet" font-size="18" fill="#ffffff">
    <text transform="translate(${xSvg(labelOffset)} ${ySvg(1)}) scale(${annotationScale} 1)">board (0,0)</text>
    <text transform="translate(${xSvg(47)} ${ySvg(1)}) scale(${annotationScale} 1)">+X</text>
    <text transform="translate(${xSvg(labelOffset)} ${ySvg(23)}) scale(${annotationScale} 1)">+Y</text>
  </g>`
  const heading = `<g transform="translate(${fromBottom ? width - 30 : 30} 36) scale(${annotationScale} 1)" font-family="TscircuitAlphabet" fill="#ffffff">
    <text font-size="23">circuit-to-svg: ${title}; center / top_left</text>
    <text y="32" font-size="17">Amber = input anchor; cyan = text bounds; white axes = board coordinates (mm). +X points ${fromBottom ? "left" : "right"}.</text>
    <text y="58" font-size="17">ccw_rotation is the board angle. Expected view angles come from native KiCad; glyphs are circuit-to-svg output.</text>
  </g>`
  const annotated = svg.replace(
    "</svg>",
    `${axes}${heading}${annotations}</svg>`,
  )
  if (!fromBottom) return annotated
  // Flip PCB coordinates to view the board from below.
  return annotated
    .replace(
      /(<svg[^>]*>)/,
      `$1<g transform="translate(${width} 0) scale(-1 1)">`,
    )
    .replace("</svg>", "</g></svg>")
}
