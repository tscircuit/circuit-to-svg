import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement, PcbSoldermaskOpening } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const openings: PcbSoldermaskOpening[] = [
  {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "top-opening",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 4,
    height: 6,
  },
  {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "bottom-opening",
    shape: "polygon",
    layer: "bottom",
    points: [
      { x: -3, y: -3 },
      { x: 3, y: -3 },
      { x: 0, y: 3 },
    ],
  },
]
const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  ...["top", "bottom"].flatMap(
    (layer) =>
      [
        {
          type: "pcb_trace",
          pcb_trace_id: `${layer}-trace`,
          route: [
            { route_type: "wire", x: -4, y: 0, width: 0.5, layer },
            { route_type: "wire", x: 4, y: 0, width: 0.5, layer },
          ],
        },
        {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: `${layer}-pour`,
          shape: "rect",
          layer,
          covered_with_solder_mask: true,
          center: { x: 0, y: 2 },
          width: 6,
          height: 1,
        },
      ] as AnyCircuitElement[],
  ),
  ...openings,
]
const options = {
  width: 400,
  height: 400,
  viewport: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
  colorOverrides: {
    copper: { top: "#ff0000", bottom: "#0000ff" },
    substrate: "#c9a26e",
  },
}

test.each(["top", "bottom"] as const)(
  "standalone %s openings expose existing copper and substrate",
  async (layer) => {
    const svg = convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      layer,
      showSolderMask: true,
    })
    expect(svg).toContain(`data-pcb-soldermask-opening-id="${layer}-opening"`)
    expect(svg).not.toContain(
      `data-pcb-soldermask-opening-id="${layer === "top" ? "bottom" : "top"}-opening"`,
    )
    expect(svg).toContain(`clip-path="url(#pcb-soldermask-openings-${layer})"`)
    const rendered = new Resvg(svg).render()
    const pixel = (x: number, y: number) => {
      const offset =
        (Math.floor((5 - y) * 40) * 400 + Math.floor((x + 5) * 40)) * 4
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

test("mask geometry is invisible when mask rendering is disabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    ...options,
    layer: "top",
    showSolderMask: false,
  })
  const withoutOpenings = convertCircuitJsonToPcbSvg(
    circuit.filter((element) => element.type !== "pcb_soldermask_opening"),
    { ...options, layer: "top", showSolderMask: false },
  )
  expect(svg).toBe(withoutOpenings)
})

test("hidden mask openings do not expand an unframed footprint viewport", () => {
  const copper = circuit.filter((element) => element.type === "pcb_trace")
  const distantOpening: PcbSoldermaskOpening = {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "distant",
    shape: "circle",
    layer: "bottom",
    x: 1000,
    y: 1000,
    radius: 10,
  }
  for (const showSolderMask of [false, true]) {
    expect(
      convertCircuitJsonToPcbSvg([...copper, distantOpening], {
        layer: "top",
        showSolderMask,
      }),
    ).toBe(convertCircuitJsonToPcbSvg(copper, { layer: "top", showSolderMask }))
  }
})

test("renders circles and rotated rectangles without requiring a board", async () => {
  const circuit: PcbSoldermaskOpening[] = [
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "circle",
      shape: "circle",
      layer: "top",
      x: -2,
      y: 0,
      radius: 1,
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "rotated",
      shape: "rotated_rect",
      layer: "top",
      x: 2,
      y: 0,
      width: 3,
      height: 1,
      ccw_rotation: 45,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
    layer: "top",
  })
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("rotate(-45 ")
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "standalone-soldermask-openings-circle-and-rotated-rect",
  )
})
