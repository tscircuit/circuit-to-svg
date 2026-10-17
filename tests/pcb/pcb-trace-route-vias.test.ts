import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PCBVia,
  PcbBoard,
  PcbTrace,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync, type INode } from "svgson"

const viaPoint = {
  route_type: "via" as const,
  x: 0,
  y: 0,
  from_layer: "bottom" as const,
  to_layer: "inner2" as const,
  outer_diameter: 2,
  hole_diameter: 1,
}
const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace",
  route: [
    { route_type: "wire", x: -4, y: 0, width: 0.2, layer: "bottom" },
    { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "bottom" },
    viaPoint,
  ],
}
const standalone: PCBVia = {
  type: "pcb_via",
  pcb_via_id: "standalone",
  x: 0,
  y: 0,
  layers: ["top", "inner1"],
  outer_diameter: 3,
  hole_diameter: 1.5,
}
const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board",
  subcircuit_id: "sub",
  center: { x: 0, y: 0 },
  width: 10,
  height: 6,
  thickness: 1.6,
  num_layers: 4,
  material: "fr4",
  min_via_hole_diameter: 0.4,
  min_via_pad_diameter: 1.2,
}
const render = (elements: AnyCircuitElement[]) =>
  convertCircuitJsonToPcbSvg(elements, {
    width: 500,
    height: 300,
    viewport: { minX: -5, maxX: 5, minY: -3, maxY: 3 },
    layer: "bottom",
    showSolderMask: true,
    includeVersion: false,
  })

function collectViaRadii({
  node,
  kind,
  radii,
}: {
  node: INode
  kind: "outer" | "inner"
  radii: number[]
}) {
  if (node.attributes.class === `pcb-hole-${kind}`)
    radii.push(Number(node.attributes.r))
  for (const child of node.children)
    collectViaRadii({ node: child, kind, radii })
}

function viaRadii(svg: string, kind: "outer" | "inner") {
  const radii: number[] = []
  collectViaRadii({ node: parseSync(svg), kind, radii })
  return radii
}

test("route via dimensions override adjacent wire width and board defaults", () => {
  for (const elements of [
    [trace],
    [board, { ...trace, subcircuit_id: "sub" }],
  ] as const) {
    const svg = render([...elements])
    // The viewport maps one millimetre to 50 pixels: radii are diameter / 2.
    expect(viaRadii(svg, "outer")).toEqual([50])
    expect(viaRadii(svg, "inner")).toEqual([25])
  }
})

test("missing route dimensions independently retain board fallbacks", () => {
  for (const dimension of ["outer_diameter", "hole_diameter"] as const) {
    const point = { ...viaPoint, [dimension]: undefined }
    const svg = render([
      board,
      {
        ...trace,
        subcircuit_id: "sub",
        route: [...trace.route.slice(0, -1), point],
      },
    ])
    expect(viaRadii(svg, "outer")).toEqual([
      dimension === "outer_diameter" ? 30 : 50,
    ])
    expect(viaRadii(svg, "inner")).toEqual([
      dimension === "hole_diameter" ? 10 : 25,
    ])
  }
})

test("a standalone via on unrelated layers does not suppress a route via", () => {
  const svg = render([standalone, trace])
  expect(viaRadii(svg, "outer")).toEqual([50])
  expect(viaRadii(svg, "inner")).toEqual([25])
})

test("a standalone via spanning the route layers is drawn only once", () => {
  const svg = render([
    { ...standalone, layers: ["bottom", "inner2", "inner1"] },
    trace,
  ])
  expect(viaRadii(svg, "outer")).toEqual([75])
  expect(viaRadii(svg, "inner")).toEqual([37.5])
})

test("a standalone via on a different board does not suppress a route via", () => {
  const svg = render([
    board,
    {
      ...board,
      pcb_board_id: "other-board",
      subcircuit_id: "other-sub",
      center: { x: 20, y: 0 },
    },
    {
      ...standalone,
      subcircuit_id: "other-sub",
      layers: ["bottom", "inner2"],
      outer_diameter: 1,
      hole_diameter: 0.5,
    },
    { ...trace, subcircuit_id: "sub" },
  ])
  expect(viaRadii(svg, "outer").sort((a, b) => a - b)).toEqual([25, 50])
  expect(viaRadii(svg, "inner").sort((a, b) => a - b)).toEqual([12.5, 25])
})
