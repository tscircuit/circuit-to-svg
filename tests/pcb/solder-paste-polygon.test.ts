import { expect, test } from "bun:test"
import { pcb_solder_paste } from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSolderPasteMask,
} from "lib"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromSolderPaste } from "lib/pcb/svg-object-fns/convert-circuit-json-to-solder-paste-mask"
import { compose, scale, translate } from "transformation-matrix"

test.each(["top", "bottom"] as const)(
  "%s polygon paste preserves concavity and openings without a board",
  (layer) => {
    const paste = pcb_solder_paste.parse({
      type: "pcb_solder_paste",
      shape: "polygon",
      layer,
      points: [
        { x: 10, y: -5 },
        { x: 14, y: -5 },
        { x: 14, y: -3 },
        { x: 13, y: -3 },
        { x: 13, y: -1 },
        { x: 10, y: -1 },
      ],
      holes: [
        [
          { x: 11, y: -4 },
          { x: 12, y: -4 },
          { x: 12, y: -2 },
          { x: 11, y: -2 },
        ],
      ],
    })
    const oppositeLayer = layer === "top" ? "bottom" : "top"
    const mask = convertCircuitJsonToSolderPasteMask([paste], { layer })
    const pcb = convertCircuitJsonToPcbSvg([paste], {
      layer,
      showSolderPaste: true,
    })

    for (const svg of [mask, pcb]) {
      expect(svg).toContain('data-type="pcb_solder_paste"')
      expect(svg).toContain(`data-pcb-layer="${layer}"`)
      expect(svg).toContain('fill-rule="evenodd"')
      expect(svg).not.toMatch(/NaN|Infinity/)
    }
    expect(mask).toMatchSvgSnapshot(
      import.meta.path,
      `solder-paste-polygon.${layer}-mask`,
    )
    expect(pcb).toMatchSvgSnapshot(
      import.meta.path,
      `solder-paste-polygon.${layer}-pcb`,
    )
    expect(convertCircuitJsonToPcbSvg([paste])).not.toContain(
      'data-type="pcb_solder_paste"',
    )
    expect(
      convertCircuitJsonToPcbSvg([paste], {
        layer: oppositeLayer,
        showSolderPaste: true,
      }),
    ).not.toContain('data-type="pcb_solder_paste"')
    expect(
      convertCircuitJsonToSolderPasteMask([paste], { layer: oppositeLayer }),
    ).not.toContain('data-type="pcb_solder_paste"')
  },
)

test("polygon paste without openings uses the PCB coordinate transform", () => {
  const paste = pcb_solder_paste.parse({
    type: "pcb_solder_paste",
    shape: "polygon",
    layer: "top",
    points: [
      { x: 1, y: -1 },
      { x: 4, y: -1 },
      { x: 1, y: 2 },
    ],
  })
  const [path] = createSvgObjectsFromSolderPaste(paste, {
    transform: compose(translate(5, 9), scale(2, -2)),
    colorMap: DEFAULT_PCB_COLOR_MAP,
  })

  expect(path.name).toBe("path")
  expect(path.attributes.d).toBe("M 7 11 L 13 11 L 7 5 L 7 11 Z")
})
