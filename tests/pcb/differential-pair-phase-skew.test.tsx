import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import {
  LayerChangeBoard,
  LoadEndMeanderBoard,
  LocalCompensationBoard,
  MatchedPairBoard,
  renderBoard,
} from "./phase-skew/example-boards.fixture"
import { renderForumExampleBoard } from "./phase-skew/forum-example-board.fixture"

const white = "rgb(255, 255, 255)"
const blue = "rgb(0, 0, 255)"
const red = "rgb(255, 0, 0)"
const skewType = "pcb_differential_pair_phase_skew"

const isSkew = (object: ReturnType<typeof parseSync>) =>
  object.attributes["data-type"] === skewType
const skewStrokes = (svg: string) => parseSync(svg).children.filter(isSkew)

function withTitle(svg: string, title: string) {
  return svg.replace(
    "</svg>",
    `<title>${title}</title><text x="16" y="24" font-family="sans-serif" font-size="16" fill="white">${title}</text></svg>`,
  )
}

test.each([
  {
    name: "matched-pair",
    title: "Matched pair",
    detail: "White throughout",
    render: () => renderBoard(<MatchedPairBoard />),
    colors: [white],
  },
  {
    name: "load-end-meander",
    title: "Load-end meander",
    detail: "Opposite colors fade to white at the load",
    render: () => renderBoard(<LoadEndMeanderBoard />),
    colors: [white, red, blue],
  },
  {
    name: "local-compensation",
    title: "Local compensation",
    detail: "Top pair returns to white. Lower pair keeps its skew.",
    render: () => renderBoard(<LocalCompensationBoard />),
    colors: [white, red, blue],
  },
  {
    name: "layer-change",
    title: "Layer change",
    detail:
      "Red and blue continue through the vias. Drill centers stay visible.",
    render: () => renderBoard(<LayerChangeBoard />),
    colors: [white, red, blue],
  },
  {
    name: "kicad-forum",
    title: "KiCad forum example",
    detail: "Upper pair switches polarity and reaches the load in step",
    render: renderForumExampleBoard,
    colors: [white, red, blue],
  },
])(
  "$title phase skew overlay",
  async ({ name, title, detail, render, colors }) => {
    const circuit = render()
    const size = { width: 800, height: name === "kicad-forum" ? 490 : 370 }
    const baseline = convertCircuitJsonToPcbSvg(circuit, size)
    const before = convertCircuitJsonToPcbSvg(circuit, {
      ...size,
      showDifferentialPairPhaseSkew: false,
    })
    const after = convertCircuitJsonToPcbSvg(circuit, {
      ...size,
      showDifferentialPairPhaseSkew: true,
    })
    expect(before).toBe(baseline)
    expect(skewStrokes(before)).toHaveLength(0)
    const strokes = skewStrokes(after)
    const renderedColors = new Set(
      strokes.map(({ attributes }) => attributes.stroke),
    )
    for (const color of colors) expect(renderedColors.has(color)).toBe(true)
    if (name === "matched-pair")
      expect(renderedColors).toEqual(new Set([white]))
    for (const { attributes } of strokes) {
      expect(attributes["stroke-linecap"]).toBe("round")
    }

    await expect(
      withTitle(before, `${title} — Copper only`),
    ).toMatchSvgSnapshot(import.meta.path, `phase-skew-${name}-before`)
    await expect(withTitle(after, `${title} — ${detail}`)).toMatchSvgSnapshot(
      import.meta.path,
      `phase-skew-${name}-after`,
    )
  },
)

test("phase skew strokes follow copper layer order and stay below via drills", async () => {
  const circuit = renderBoard(<LayerChangeBoard />)
  const options = {
    showDifferentialPairPhaseSkew: true,
    width: 800,
    height: 370,
  }
  const objects = parseSync(
    convertCircuitJsonToPcbSvg(circuit, options),
  ).children
  const firstTopCopper = objects.findIndex(
    ({ attributes }) =>
      attributes["data-type"] === "pcb_trace" &&
      attributes["data-pcb-layer"] === "top",
  )
  const firstVia = objects.findIndex(
    ({ attributes }) => attributes["data-type"] === "pcb_via",
  )
  expect(firstVia).toBeGreaterThan(firstTopCopper)
  expect(
    objects[firstVia]?.children.some(
      ({ attributes }) => attributes["data-pcb-layer"] === "drill",
    ),
  ).toBe(true)

  for (const layer of ["top", "bottom"] as const) {
    const strokeIndices = objects.flatMap((object, index) =>
      isSkew(object) && object.attributes["data-pcb-layer"] === layer
        ? [index]
        : [],
    )
    expect(strokeIndices.length).toBeGreaterThan(0)
    const lastCopper = objects.findLastIndex(
      ({ attributes }) =>
        ["pcb_trace", "pcb_smtpad"].includes(attributes["data-type"] ?? "") &&
        attributes["data-pcb-layer"] === layer,
    )
    expect(strokeIndices[0]).toBeGreaterThan(lastCopper)
    expect(strokeIndices.at(-1)).toBeLessThan(
      layer === "bottom" ? firstTopCopper : firstVia,
    )

    const after = convertCircuitJsonToPcbSvg(circuit, { ...options, layer })
    const filtered = skewStrokes(after)
    expect(filtered).toHaveLength(strokeIndices.length)
    expect(
      filtered.every(
        ({ attributes }) => attributes["data-pcb-layer"] === layer,
      ),
    ).toBe(true)
    const before = convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      layer,
      showDifferentialPairPhaseSkew: false,
    })
    await expect(
      withTitle(before, `Layer change — ${layer} copper only`),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `phase-skew-layer-change-${layer}-before`,
    )
    const detail =
      layer === "top"
        ? "Skew develops before the vias"
        : "Skew fades after the vias"
    await expect(
      withTitle(after, `Layer change — ${detail}`),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `phase-skew-layer-change-${layer}-after`,
    )
  }
})

test("the zero color is overridable and matched traces are widened by 10%", () => {
  const svg = convertCircuitJsonToPcbSvg(renderBoard(<MatchedPairBoard />), {
    showDifferentialPairPhaseSkew: true,
    phaseSkewColors: { zero: "#80c040" },
  })
  const objects = parseSync(svg).children
  const trace = objects.find(
    ({ attributes }) => attributes["data-type"] === "pcb_trace",
  )!
  const strokes = objects.filter(isSkew)
  expect(strokes.length).toBeGreaterThan(0)
  for (const { attributes } of strokes) {
    expect(attributes.stroke).toBe("rgb(128, 192, 64)")
    expect(Number(attributes["stroke-width"])).toBeCloseTo(
      Number(trace.attributes["stroke-width"]) * 1.1,
    )
  }
})
