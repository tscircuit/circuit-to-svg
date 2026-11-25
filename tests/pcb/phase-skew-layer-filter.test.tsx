import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import {
  isPhaseSkewStroke,
  LAYER_CHANGE,
  PHASE_SKEW_SVG_SIZE,
  renderDifferentialPair,
  TUNING_BUMP,
} from "./phase-skew/differential-pair.fixture"

test("phase skew follows copper layer visibility and stays below via drills", async () => {
  const circuitJson = await renderDifferentialPair({
    positivePath: [...TUNING_BUMP, ...LAYER_CHANGE],
    negativePath: LAYER_CHANGE,
    loadLayer: "bottom",
  })
  const options = {
    ...PHASE_SKEW_SVG_SIZE,
    showDifferentialPairPhaseSkew: true,
  }
  const allLayers = convertCircuitJsonToPcbSvg(circuitJson, options)
  const topLayer = convertCircuitJsonToPcbSvg(circuitJson, {
    ...options,
    layer: "top",
  })
  const objects = parseSync(allLayers).children
  const strokes = objects.filter(isPhaseSkewStroke)
  expect(
    new Set(strokes.map(({ attributes }) => attributes["data-pcb-layer"])),
  ).toEqual(new Set(["top", "bottom"]))
  const firstVia = objects.findIndex(({ children }) =>
    children.some(({ attributes }) => attributes["data-pcb-layer"] === "drill"),
  )
  expect(firstVia).toBeGreaterThan(objects.findLastIndex(isPhaseSkewStroke))
  for (const layer of ["bottom", "top"]) {
    const lastTrace = objects.findLastIndex(
      ({ attributes }) =>
        attributes["data-type"] === "pcb_trace" &&
        attributes["data-pcb-layer"] === layer,
    )
    const firstSkewStroke = objects.findIndex(
      (object) =>
        isPhaseSkewStroke(object) &&
        object.attributes["data-pcb-layer"] === layer,
    )
    expect(lastTrace).toBeGreaterThanOrEqual(0)
    expect(firstSkewStroke).toBeGreaterThan(lastTrace)
  }

  const visibleStrokes = parseSync(topLayer).children.filter(isPhaseSkewStroke)
  expect(visibleStrokes.length).toBeGreaterThan(0)
  expect(
    visibleStrokes.every(
      ({ attributes }) => attributes["data-pcb-layer"] === "top",
    ),
  ).toBe(true)

  await expect(allLayers).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-all-layers",
  )
  await expect(topLayer).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-top-layer",
  )
})
