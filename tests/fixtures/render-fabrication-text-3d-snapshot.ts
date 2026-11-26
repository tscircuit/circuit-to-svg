import { Resvg } from "@resvg/resvg-js"
import base64Font from "@tscircuit/alphabet/base64font"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  convertCircuitJsonTo3D,
  convertSceneToGLTF,
  getBestCameraPosition,
} from "circuit-json-to-gltf"
import { renderGLTFToPNGFromGLB } from "poppygl"
import {
  fabricationTextBoard,
  fabricationTextCircuit,
} from "./fabrication-text-rotation-board"
import { renderFabricationTextBoardSvg } from "./render-fabrication-text-board-svg"

/**
 * The normal 3D exporter hides FAB notes. Rasterize the SVG implementation
 * under test onto its real board mesh, with independent input annotations.
 * Camera directions use glTF coordinates, where +Y is above the board.
 */
export async function renderFabricationText3dSnapshot(): Promise<Uint8Array> {
  const scene = await convertCircuitJsonTo3D(fabricationTextCircuit, {
    renderBoardTextures: false,
    showBoundingBoxes: false,
  })
  const fontDirectory = mkdtempSync(
    join(tmpdir(), "fabrication-snapshot-font-"),
  )
  const fontPath = join(fontDirectory, "tscircuit-alphabet.otf")
  try {
    writeFileSync(fontPath, Buffer.from(base64Font, "base64"))
    const texture = new Resvg(renderFabricationTextBoardSvg(), {
      font: {
        loadSystemFonts: false,
        fontFiles: [fontPath],
        defaultFontFamily: "TscircuitAlphabet",
      },
    })
      .render()
      .asPng()
    scene.boxes[0]!.texture = {
      bottom: `data:image/png;base64,${texture.toString("base64")}`,
    }
  } finally {
    rmSync(fontDirectory, { recursive: true, force: true })
  }
  const glb = await convertSceneToGLTF(scene, { binary: true })
  if (!(glb instanceof ArrayBuffer)) {
    throw new Error("Expected a GLB for the fabrication-overlay snapshot")
  }
  // The exporter uses a tiny tilt to avoid a singular bottom-up camera fit.
  // Text bounds must not affect framing: the board is the fixed reference.
  const camera = getBestCameraPosition([fabricationTextBoard], {
    direction: [0, -1, 0.001],
    aspectRatio: 1800 / 1200,
    fov: 40,
  })
  return renderGLTFToPNGFromGLB(glb, {
    width: 1800,
    height: 1200,
    ...camera,
    camPos: [
      camera.camPos[0] * 0.8,
      camera.camPos[1] * 0.8,
      camera.camPos[2] * 0.8,
    ],
    up: "z+",
    ambient: 0.95,
    backgroundColor: "#edf1f5",
  })
}
