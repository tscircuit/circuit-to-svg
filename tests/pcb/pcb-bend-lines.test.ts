import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import {
  multipleFlexBoards,
  translatedFlexBoard,
} from "./pcb-bend-lines.fixture"

test("bend lines are optional and do not change default PCB output", () => {
  const baseline = convertCircuitJsonToPcbSvg(multipleFlexBoards)
  expect(baseline).not.toContain('data-type="pcb_bend"')
  expect(
    convertCircuitJsonToPcbSvg(multipleFlexBoards, { showBendLines: false }),
  ).toBe(baseline)
  expect(baseline).toBe(
    convertCircuitJsonToPcbSvg(
      multipleFlexBoards.filter((element) => element.type !== "pcb_bend"),
    ),
  )
})

test("finite board-local endpoints are translated into the SVG viewport", async () => {
  const svg = convertCircuitJsonToPcbSvg(translatedFlexBoard, {
    showBendLines: true,
    showPcbNotes: false,
    width: 600,
    height: 600,
    viewport: { minX: 40, minY: 40, maxX: 80, maxY: 80 },
  })
  const bend = parseSync(svg).children.find(
    (child) => child.attributes["data-pcb-bend-id"] === "left_tail_bend",
  )!
  expect(bend.name).toBe("line")
  // The left tail spans world X=40..48 at Y=70. The sibling tail begins at X=72.
  expect(Number(bend.attributes.x1)).toBeCloseTo(0)
  expect(Number(bend.attributes.x2)).toBeCloseTo(120)
  expect(Number(bend.attributes.y1)).toBeCloseTo(150)
  expect(Number(bend.attributes.y2)).toBeCloseTo(150)
  expect(bend.attributes["data-pcb-layer"]).toBe("overlay")
  expect(bend.children[0]?.children[0]?.value).toBe(
    "Left tail: 90°, radius 1 mm",
  )
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "finite-tail-bend-line",
  )
})

for (const layer of ["top", "bottom"] as const) {
  test(`bend overlays on translated boards are visible from ${layer}`, async () => {
    const circuit = multipleFlexBoards.map((element) =>
      element.type === "pcb_note_text" ? { ...element, layer } : element,
    )
    const before = structuredClone(circuit)
    const svg = convertCircuitJsonToPcbSvg(circuit, {
      showBendLines: true,
      layer,
      width: 1000,
      height: 650,
    })
    const bends = parseSync(svg).children.filter(
      (child) => child.attributes["data-type"] === "pcb_bend",
    )
    expect(bends).toHaveLength(3)
    expect(bends.map((bend) => bend.attributes["data-pcb-board-id"])).toEqual([
      "u_board",
      "rect_board",
      "rect_board",
    ])
    const vertical = bends[1]!.attributes
    expect(Number(vertical.x1)).toBeCloseTo(Number(vertical.x2))
    expect(Number(vertical.y1)).toBeGreaterThan(Number(vertical.y2))
    const diagonal = bends[2]!.attributes
    expect(Number(diagonal.x1)).toBeLessThan(Number(diagonal.x2))
    expect(Number(diagonal.y1)).toBeGreaterThan(Number(diagonal.y2))
    expect(circuit).toEqual(before)
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `pcb-bend-lines-${layer}`,
    )
  })
}

test("a bend with an absent board reference is omitted", () => {
  const circuit = translatedFlexBoard.map((element) =>
    element.type === "pcb_bend"
      ? { ...element, pcb_board_id: "missing_board" }
      : element,
  )
  expect(
    convertCircuitJsonToPcbSvg(circuit, { showBendLines: true }),
  ).not.toContain('data-type="pcb_bend"')
})

test("each bend uses its own board center", () => {
  const svg = convertCircuitJsonToPcbSvg(multipleFlexBoards, {
    showBendLines: true,
    showPcbNotes: false,
    width: 1000,
    height: 600,
    viewport: { minX: 40, minY: 30, maxX: 140, maxY: 90 },
  })
  const bends = parseSync(svg).children.filter(
    (child) => child.attributes["data-type"] === "pcb_bend",
  )
  const endpoints = bends.map(({ attributes }) =>
    ["x1", "y1", "x2", "y2"].map((key) => Number(attributes[key])),
  )
  expect(endpoints).toEqual([
    [0, 200, 80, 200],
    [700, 400, 700, 200],
    [600, 360, 680, 280],
  ])
})
