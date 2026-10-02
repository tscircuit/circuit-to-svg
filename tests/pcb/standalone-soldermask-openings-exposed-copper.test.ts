import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Resvg } from "@resvg/resvg-js"
import { circuit, options } from "../fixtures/standalone-soldermask-openings"

test.each(["top", "bottom"] as const)(
  "standalone %s openings expose existing copper and substrate",
  async (layer) => {
    const topViewSvg = convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      layer,
      showSolderMask: true,
    })
    // A true underside view makes bottom silkscreen readable. This reflection
    // is presentation only; the symmetric fixture's geometry checks stay intact.
    const svg =
      layer === "bottom"
        ? topViewSvg
            .replace(
              /(<svg\b[^>]*>)/,
              `$1<g transform="translate(${options.width} 0) scale(-1 1)">`,
            )
            .replace(/<\/svg>\s*$/, "</g></svg>")
        : topViewSvg
    expect(svg).toContain(`data-pcb-soldermask-opening-id="${layer}-opening"`)
    expect(svg).not.toContain(
      `data-pcb-soldermask-opening-id="${layer === "top" ? "bottom" : "top"}-opening"`,
    )
    expect(svg).toContain(`clip-path="url(#pcb-soldermask-openings-${layer})"`)
    const rendered = new Resvg(svg).render()
    const pixel = (x: number, y: number) => {
      const offset =
        (Math.floor((7 - y) * 60) * options.width + Math.floor((x + 7) * 60)) *
        4
      return [...rendered.pixels.slice(offset, offset + 3)]
    }
    expect(pixel(0, 0)).toEqual(layer === "top" ? [255, 0, 0] : [0, 0, 255])
    expect(pixel(0, -1)).toEqual([201, 162, 110])
    expect(pixel(3.5, 0)).not.toEqual(pixel(0, 0))
    // Covered pour also loses its green overlay only inside the opening.
    expect(pixel(0, 2)).not.toEqual(pixel(2.5, 2))
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `standalone-soldermask-openings-${layer}`,
    )
  },
)
