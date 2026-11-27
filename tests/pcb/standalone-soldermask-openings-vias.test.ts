import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  createViaOpeningCircuit,
  viaOpeningOptions,
} from "../fixtures/standalone-soldermask-openings-vias"

test.each(["top", "bottom"] as const)(
  "standalone %s openings render face-accurate via copper without duplicate pin labels",
  async (layer) => {
    const viaOpeningCircuit = await createViaOpeningCircuit()
    const rawSvg = convertCircuitJsonToPcbSvg(viaOpeningCircuit, {
      ...viaOpeningOptions,
      layer,
    })
    const pinNumberMatches = rawSvg.match(/data-type="pcb_pad_pin_number"/g)
    expect(pinNumberMatches?.length ?? 0).toBe(1)

    const renderedRaw = new Resvg(rawSvg).render()
    const readPixel = (boardX: number, boardY: number) => {
      const pxX = Math.round((boardX + 6) * 60)
      const pxY = Math.round((5.5 - boardY) * 60)
      const offset = (pxY * viaOpeningOptions.width + pxX) * 4
      return [...renderedRaw.pixels.slice(offset, offset + 3)]
    }

    const expectedFaceCopper = layer === "top" ? [255, 0, 0] : [0, 0, 255]
    expect(readPixel(1.5, 0.5)).toEqual(expectedFaceCopper)
    expect(readPixel(1.85, 0.5)).toEqual([255, 0, 255])
    expect(readPixel(2.5, 0.5)).not.toEqual(expectedFaceCopper)
    expect(readPixel(-0.88, 0.5)).toEqual(
      layer === "top" ? [255, 0, 0] : [201, 162, 110],
    )
    expect(readPixel(-1, 0.5)).toEqual(
      layer === "top" ? [255, 0, 255] : [201, 162, 110],
    )
    expect(readPixel(-1.5, -1)).toEqual(expectedFaceCopper)
    expect(readPixel(-2.5, -1)).not.toEqual(expectedFaceCopper)

    const displaySvg =
      layer === "bottom"
        ? rawSvg
            .replace(
              /(<svg\b[^>]*>)/,
              `$1<g transform="translate(${viaOpeningOptions.width} 0) scale(-1 1)">`,
            )
            .replace(/<\/svg>\s*$/, "</g></svg>")
        : rawSvg

    await expect(displaySvg).toMatchSvgSnapshot(
      import.meta.path,
      `standalone-soldermask-openings-vias-${layer}`,
    )
  },
)
