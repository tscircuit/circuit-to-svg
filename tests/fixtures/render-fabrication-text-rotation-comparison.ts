import { convertCircuitJsonToPcbSvg } from "lib"
import {
  fabricationTextBoard,
  fabricationTextNotes,
} from "./fabrication-text-board"
import nativeReference from "./kicad-fabrication-reference.json"

/** Separate boards share the actual anchor (0,0), so only rotation and side vary. */
export function renderFabricationTextRotationComparison(): string {
  const panels = (["top", "bottom"] as const).flatMap((layer, row) =>
    [0, 90, 270].map((angle, column) => {
      const left = column * 480 + 30
      const top = row * 410 + 90
      let svg = convertCircuitJsonToPcbSvg(
        [
          { ...fabricationTextBoard, width: 16, height: 12 },
          {
            ...fabricationTextNotes[0]!,
            layer,
            ccw_rotation: angle,
            anchor_position: { x: 0, y: 0 },
          },
        ],
        {
          layer,
          width: 420,
          matchBoardAspectRatio: true,
          drawPaddingOutsideBoard: false,
          viewport: { minX: -8, minY: -6, maxX: 8, maxY: 6 },
          backgroundColor: "#14583e",
          showFabricationNotes: true,
          includeVersion: false,
        },
      )
      if (layer === "bottom") {
        svg = svg
          .replace(
            /(<svg[^>]*>)/,
            '$1<g transform="translate(420 0) scale(-1 1)">',
          )
          .replace("</svg>", "</g></svg>")
      }
      const basis =
        nativeReference.views[layer][
          nativeReference.board_angles.indexOf(angle)
        ]!
      const viewAngle =
        ((Math.atan2(-basis[1]!, basis[0]!) * 180) / Math.PI + 360) % 360
      const positiveX = layer === "top" ? 395 : 25
      const axes = `<g stroke="#c1d9ce" stroke-width="1" opacity="0.5"><path d="M 15 157.5 H 405 M 210 15 V 300"/></g>
        <g font-family="TscircuitAlphabet" font-size="15" fill="#ffffff"><text x="${positiveX}" y="145" text-anchor="middle">+X</text><text x="220" y="26">+Y</text><text x="230" y="187">(0,0)</text></g>
        <g transform="translate(210 157.5)" stroke="#ffb62e" stroke-width="2" fill="none"><path d="M -9 0 H 9 M 0 -9 V 9"/><circle r="3"/></g>`
      svg = svg
        .replace("</svg>", `${axes}</svg>`)
        .replace("<svg ", `<svg x="${left}" y="${top + 80}" `)
      return `<g><text x="${left}" y="${top + 22}" font-size="20">${layer.toUpperCase()} / VIEW FROM ${layer === "top" ? "ABOVE" : "BELOW"}</text>
        <text x="${left}" y="${top + 43}" font-size="17">input ${angle} CCW; expected ${viewAngle} CCW</text>
        <text x="${left}" y="${top + 63}" font-size="15">anchor (0,0), alignment center</text>${svg}</g>`
    }),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="925"><rect width="1440" height="925" fill="#0a2419"/><g font-family="TscircuitAlphabet" fill="#ffffff"><text x="30" y="30" font-size="24">Same anchor; compare 0, 90 and 270 degrees on both sides</text><text x="30" y="58" font-size="17">Each panel is a separate board. Expected angles come from native KiCad; glyphs are circuit-to-svg output.</text>${panels.join("")}</g></svg>`
}
