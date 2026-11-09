import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour, PcbTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSoldermaskOpeningMasks } from "lib/pcb/create-soldermask-opening-masks"
import { createSvgObjectsFromPcbTrace } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-trace"
import { parseSync } from "svgson"
import { identity } from "transformation-matrix"

test("multi-layer soldermask render masks bottom copper pours at bottom pad openings and positive soldermask margins", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 12,
      height: 8,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_bottom",
      shape: "rect",
      layer: "bottom",
      center: { x: 0, y: 0 },
      width: 10,
      height: 6,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_bottom_positive_margin",
      pcb_component_id: "comp1",
      shape: "rect",
      layer: "bottom",
      x: 0,
      y: 0,
      width: 1.6,
      height: 1.2,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.2,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })
  const parsed = parseSync(svg)

  const maskNodes: any[] = []
  const coveredPourNodes: any[] = []
  const visit = (node: any) => {
    if (
      node.name === "mask" &&
      node.attributes?.id === "copper-pour-pad-opening-mask-bottom"
    ) {
      maskNodes.push(node)
    }
    if (node.attributes?.class === "pcb-soldermask-covered-pour") {
      coveredPourNodes.push(node)
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(parsed)

  expect(maskNodes).toHaveLength(1)
  expect(coveredPourNodes).toHaveLength(1)
  expect(coveredPourNodes[0].attributes.mask).toBe(
    "url(#copper-pour-pad-opening-mask-bottom)",
  )
  // Both the positive-margin soldermask cutout and the pad itself should be in the mask cutouts
  const maskBlackRects = maskNodes[0].children.filter(
    (c: any) => c.attributes?.fill === "black",
  )
  expect(maskBlackRects).toHaveLength(2)
  expect(
    maskBlackRects.some(
      (c: any) => c.attributes?.class === "pcb-soldermask-cutout",
    ),
  ).toBe(true)
})

test("createSoldermaskOpeningMasks only masks via tenting on the matching layer", () => {
  const bottomViaTenting: {
    name: string
    type: "element"
    value: string
    attributes: Record<string, string>
    children: any[]
  } = {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      class: "pcb-via-tenting",
      "data-type": "pcb_soldermask",
      "data-pcb-layer": "bottom",
    },
    children: [],
  }
  const objects: any[] = [
    {
      name: "rect",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-pad",
        "data-type": "pcb_smtpad",
        "data-pcb-layer": "top",
        x: "10",
        y: "10",
        width: "20",
        height: "20",
      },
      children: [],
    },
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        "data-type": "pcb_via",
        "data-pcb-layer": "bottom",
      },
      children: [bottomViaTenting],
    },
  ]

  const defs = createSoldermaskOpeningMasks({
    objects,
    layer: "top",
    width: 100,
    height: 100,
    showSolderMask: true,
  })

  expect(defs).toBeNull()
  expect(bottomViaTenting.attributes.mask).toBeUndefined()
})

test("clips trace entering a BRep copper pour when inner_rings is omitted", () => {
  const pour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep_no_inner",
    layer: "top",
    shape: "brep",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -2, y: -2 },
          { x: 2, y: -2 },
          { x: 2, y: 2 },
          { x: -2, y: 2 },
        ],
      },
    },
    covered_with_solder_mask: true,
  } as unknown as PcbCopperPour

  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_brep_no_inner",
    route: [
      {
        route_type: "wire",
        x: -4,
        y: 0,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0,
        y: 0,
        width: 0.2,
        layer: "top",
        copper_pour_id: "pour_brep_no_inner",
        is_inside_copper_pour: true,
      },
    ],
  }

  const svgObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson: [trace, pour],
  })

  expect(svgObjects).toHaveLength(1)
  expect(svgObjects[0]?.attributes?.d).toBe("M -4 0 L -2 0")
})

test("clips linear wire taper segment at the copper pour boundary", () => {
  const pour: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_taper",
    layer: "top",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 4,
    height: 4,
    covered_with_solder_mask: true,
  }

  const trace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_taper",
    route: [
      {
        route_type: "wire",
        x: -4,
        y: 0,
        width: 0.2,
        start_width: 0.2,
        end_width: 0.6,
        width_interpolation_mode: "linear",
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0,
        y: 0,
        width: 0.6,
        layer: "top",
        copper_pour_id: "pour_taper",
        is_inside_copper_pour: true,
      },
    ],
  } as unknown as PcbTrace

  const svgObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson: [trace, pour],
  })

  expect(svgObjects).toHaveLength(1)
  const d = svgObjects[0]?.attributes?.d ?? ""
  const coords = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map(
    (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
  )
  // Clipped at x = -2 (halfway from -4 to 0), where width is interpolated to 0.4 (y = +-0.2)
  expect(Math.max(...coords.map((p) => p.x))).toBeCloseTo(-2, 6)
  expect(
    Math.max(
      ...coords.filter((p) => Math.abs(p.x - -2) < 1e-6).map((p) => p.y),
    ),
  ).toBeCloseTo(0.2, 6)
})

test("filters synthetic route vias by ctx.layer and parses string trace widths", () => {
  const trace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_route_via",
    route: [
      {
        route_type: "wire",
        x: -2,
        y: 0,
        width: "0.5mm",
        layer: "top",
      },
      {
        route_type: "via",
        x: 0,
        y: 0,
        from_layer: "top",
        to_layer: "inner1",
      },
      {
        route_type: "wire",
        x: 2,
        y: 0,
        width: "0.5mm",
        layer: "inner1",
      },
    ],
  } as unknown as PcbTrace

  const bottomObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    layer: "bottom",
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson: [trace],
  })
  expect(bottomObjects).toHaveLength(0)

  const topObjects = createSvgObjectsFromPcbTrace(trace, {
    transform: identity(),
    layer: "top",
    colorMap: DEFAULT_PCB_COLOR_MAP,
    circuitJson: [trace],
  })
  const viaGroup = topObjects.find(
    (obj) => obj.attributes?.["data-type"] === "pcb_via",
  )
  expect(viaGroup).toBeDefined()
  const outerCircle = viaGroup?.children?.find(
    (c: any) => c.attributes?.class === "pcb-hole-outer",
  )
  // With adjacent width "0.5mm", holeDiameter = 0.5, outerDiameter = 1.0 -> outerRadius = 0.5
  expect(Number(outerCircle?.attributes?.r)).toBeCloseTo(0.5, 6)
})
