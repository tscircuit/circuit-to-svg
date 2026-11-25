import { Resvg } from "@resvg/resvg-js"
import base64Font from "@tscircuit/alphabet/base64font"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { CircuitJson } from "circuit-json"
import {
  convertCircuitJsonTo3D,
  convertSceneToGLTF,
  getBestCameraPosition,
} from "circuit-json-to-gltf"
import { convertCircuitJsonToPcbSvg } from "lib"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { renderAnchorCrosshair } from "./render-fabrication-text-anchor-snapshot"

/**
 * Test-only fabrication overlay. The normal 3D exporter hides fabrication
 * notes, so explicitly rasterize the SVG implementation under test onto its
 * board mesh. PCB points are in mm (+X right, +Y up, +Z above the board);
 * camera points use the exporter's glTF frame (+Y above the board).
 */
export async function renderFabricationText3dSnapshot(
  circuitJson: CircuitJson,
): Promise<string> {
  const scene = await convertCircuitJsonTo3D(circuitJson, {
    renderBoardTextures: false,
    showBoundingBoxes: false,
  })
  const boardMesh = scene.boxes[0]!
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!board || board.width === undefined || board.height === undefined) {
    throw new Error(
      "Fabrication snapshots require a board with explicit dimensions",
    )
  }
  const { width, height, center } = board
  const textures: { top?: string; bottom?: string } = {}
  const fontDirectory = mkdtempSync(
    join(tmpdir(), "fabrication-snapshot-font-"),
  )
  const fontPath = join(fontDirectory, "tscircuit-alphabet.otf")
  try {
    writeFileSync(fontPath, Buffer.from(base64Font, "base64"))
    for (const layer of ["top", "bottom"] as const) {
      const svg = convertCircuitJsonToPcbSvg(circuitJson, {
        layer,
        width: 1200,
        matchBoardAspectRatio: true,
        drawPaddingOutsideBoard: false,
        backgroundColor: "#14583e",
        showFabricationNotes: true,
        includeVersion: false,
      })
      const scale = 1200 / width
      const markers = circuitJson
        .filter(
          (element) =>
            element.type === "pcb_fabrication_note_text" &&
            element.layer === layer,
        )
        .map((element) => {
          if (element.type !== "pcb_fabrication_note_text") return ""
          return renderAnchorCrosshair(
            (element.anchor_position.x - center.x + width / 2) * scale,
            (center.y + height / 2 - element.anchor_position.y) * scale,
          )
        })
        .join("")
      // Embedded PNGs are compared across machines; use the bundled font rather
      // than whichever fallback font happens to be installed on the host.
      const png = new Resvg(svg.replace("</svg>", `${markers}</svg>`), {
        font: {
          loadSystemFonts: false,
          fontFiles: [fontPath],
          defaultFontFamily: "TscircuitAlphabet",
        },
      })
        .render()
        .asPng()
      textures[layer] = `data:image/png;base64,${png.toString("base64")}`
    }
  } finally {
    rmSync(fontDirectory, { recursive: true, force: true })
  }
  boardMesh.texture = textures
  const glb = await convertSceneToGLTF(scene, { binary: true })
  if (!(glb instanceof ArrayBuffer)) {
    throw new Error("Expected a GLB for the fabrication-overlay snapshot")
  }

  const panels: string[] = []
  const views = [
    { layer: "top", direction: [0, 1, -0.7] as const },
    { layer: "bottom", direction: [0, -1, 0.7] as const },
  ]
  for (const [column, view] of views.entries()) {
    const camera = getBestCameraPosition(circuitJson, {
      direction: view.direction,
      aspectRatio: 800 / 620,
      fov: 40,
    })
    const png = await renderGLTFToPNGFromGLB(glb, {
      width: 800,
      height: 620,
      ...camera,
      ambient: 0.8,
      backgroundColor: "#edf1f5",
    })
    const left = column * 800
    panels.push(
      `<text x="${left + 24}" y="28">3D ${view.layer} · FAB overlay · amber: input anchor</text>`,
      `<image x="${left}" y="44" width="800" height="620" href="data:image/png;base64,${Buffer.from(png).toString("base64")}"/>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="664" viewBox="0 0 1600 664"><rect width="1600" height="664" fill="#edf1f5"/><g font-family="sans-serif" font-size="20" fill="#172a3a">${panels.join("")}</g></svg>`
}
