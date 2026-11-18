import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { type INode, parseSync } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

function getRenderedPin1IndicatorCornersByComponentName(svg: string) {
  const root = parseSync(svg)
  const corners = new Map<
    string,
    {
      centerX: number
      centerY: number
      cornerX: number
      cornerY: number
      halfW: number
      halfH: number
    }
  >()

  for (const child of root.children) {
    if (child.name !== "g") continue
    const transform = child.attributes.transform ?? ""
    const match = transform.match(
      /translate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*,\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/i,
    )
    if (!match) continue
    const centerX = Number(match[1])
    const centerY = Number(match[2])

    const textNode = child.children.find(
      (n: INode) =>
        n.name === "text" &&
        (n.attributes.class ?? "").includes("assembly-component-label"),
    )
    const label = textNode?.children?.[0]?.value
    const polyNode = child.children.find(
      (n: INode) =>
        n.name === "polygon" &&
        (n.attributes.class ?? "").includes("assembly-pin1-indicator"),
    )
    const pathNode = child.children.find(
      (n: INode) =>
        n.name === "path" &&
        (n.attributes.class ?? "").includes("assembly-component"),
    )
    if (!label || !polyNode || !pathNode) continue

    const firstVertex = (polyNode.attributes.points ?? "")
      .trim()
      .split(/\s+/)[0]!
      .split(",")
      .map(Number)
    let localX = firstVertex[0]!
    let localY = firstVertex[1]!

    const polyTransform = polyNode.attributes.transform ?? ""
    const rotMatch = polyTransform.match(
      /rotate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/i,
    )
    if (rotMatch) {
      const rad = (Number(rotMatch[1]) * Math.PI) / 180
      const rx = localX * Math.cos(rad) - localY * Math.sin(rad)
      const ry = localX * Math.sin(rad) + localY * Math.cos(rad)
      localX = rx
      localY = ry
    }

    // Group has `translate(centerX, centerY) scale(1, -1)`
    const cornerX = centerX + localX
    const cornerY = centerY - localY

    const pathCoords = [
      ...(pathNode.attributes.d ?? "").matchAll(
        /([+-]?\d*\.?\d+(?:e[+-]?\d+)?),([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g,
      ),
    ].map((m) => [Number(m[1]), Number(m[2])] as const)
    const pathRotMatch = (pathNode.attributes.transform ?? "").match(
      /rotate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/i,
    )
    const pathRad = pathRotMatch ? (Number(pathRotMatch[1]) * Math.PI) / 180 : 0
    const rotatedPathCoords = pathCoords.map(([px, py]) => [
      px * Math.cos(pathRad) - py * Math.sin(pathRad),
      px * Math.sin(pathRad) + py * Math.cos(pathRad),
    ])
    const halfW = Math.max(...rotatedPathCoords.map(([px]) => Math.abs(px!)))
    const halfH = Math.max(...rotatedPathCoords.map(([, py]) => Math.abs(py!)))

    corners.set(label, { centerX, centerY, cornerX, cornerY, halfW, halfH })
  }

  return corners
}

test("assembly pin-1 indicator tracks rotated non-square components without double rotation", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="36mm" height="28mm">
      <chip name="U0" footprint="dip4" pcbX={-10} pcbY={6} pcbRotation={0} />
      <chip name="U90" footprint="dip4" pcbX={0} pcbY={6} pcbRotation={90} />
      <chip name="U180" footprint="dip4" pcbX={10} pcbY={6} pcbRotation={180} />
      <chip
        name="U270"
        footprint="dip4"
        pcbX={-10}
        pcbY={-6}
        pcbRotation={270}
      />
      <chip
        name="UB90"
        footprint="dip4"
        layer="bottom"
        pcbX={4}
        pcbY={-6}
        pcbRotation={90}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToAssemblySvg(circuitJson as any, {})
  const corners = getRenderedPin1IndicatorCornersByComponentName(svg)

  for (const name of ["U0", "U90", "U180", "U270", "UB90"]) {
    const sc = circuitJson.find(
      (e): e is Extract<AnyCircuitElement, { type: "source_component" }> =>
        e.type === "source_component" && e.name === name,
    )!
    const pc = circuitJson.find(
      (e): e is Extract<AnyCircuitElement, { type: "pcb_component" }> =>
        e.type === "pcb_component" &&
        e.source_component_id === sc.source_component_id,
    )!
    const pin1SourcePort = circuitJson.find(
      (e): e is Extract<AnyCircuitElement, { type: "source_port" }> =>
        e.type === "source_port" &&
        e.source_component_id === sc.source_component_id &&
        e.pin_number === 1,
    )!
    const pin1PcbPort = circuitJson.find(
      (e): e is Extract<AnyCircuitElement, { type: "pcb_port" }> =>
        e.type === "pcb_port" &&
        e.source_port_id === pin1SourcePort.source_port_id,
    )!

    const rendered = corners.get(name)!
    expect(rendered).toBeDefined()

    // Corner must lie directly on the component outline bounds (never rotated outside it)
    expect(
      Math.abs(Math.abs(rendered.cornerX - rendered.centerX) - rendered.halfW),
    ).toBeLessThan(1e-6)
    expect(
      Math.abs(Math.abs(rendered.cornerY - rendered.centerY) - rendered.halfH),
    ).toBeLessThan(1e-6)

    // In SVG coordinates: +X matches board +X, +Y is inverted board -Y
    expect(Math.sign(rendered.cornerX - rendered.centerX)).toBe(
      Math.sign(pin1PcbPort.x - pc.center.x),
    )
    expect(Math.sign(rendered.cornerY - rendered.centerY)).toBe(
      -Math.sign(pin1PcbPort.y - pc.center.y),
    )
  }

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("assembly pin-1 indicator selects pin 1 or A1 when ports[0] is another pin", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 24,
      height: 16,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // U_NUM: ports[0] is pin 10 at bottom-right; canonical pin_number=1 (empty port_hints) is at top-left
    {
      type: "source_component",
      source_component_id: "sc_num",
      ftype: "simple_chip",
      name: "U_NUM",
    },
    {
      type: "source_port",
      source_port_id: "sp_num_10",
      source_component_id: "sc_num",
      name: "pin10",
      pin_number: 10,
      port_hints: ["pin10", "10"],
    },
    {
      type: "source_port",
      source_port_id: "sp_num_1",
      source_component_id: "sc_num",
      name: "VCC",
      pin_number: 1,
      port_hints: [],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc_num",
      source_component_id: "sc_num",
      center: { x: -5, y: 0 },
      width: 6,
      height: 4,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_num_10",
      pcb_component_id: "pc_num",
      source_port_id: "sp_num_10",
      x: -3,
      y: -1.5,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_num_1",
      pcb_component_id: "pc_num",
      source_port_id: "sp_num_1",
      x: -7,
      y: 1.5,
      layers: ["top"],
    },
    // U_BGA: ports[0] is B2 at top-left; A1 hint (without pin_number) is at bottom-right
    {
      type: "source_component",
      source_component_id: "sc_bga",
      ftype: "simple_chip",
      name: "U_BGA",
    },
    {
      type: "source_port",
      source_port_id: "sp_bga_b2",
      source_component_id: "sc_bga",
      name: "B2",
      port_hints: ["B2", "A10"],
    },
    {
      type: "source_port",
      source_port_id: "sp_bga_a1",
      source_component_id: "sc_bga",
      name: "BALL_A1",
      port_hints: ["A1"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc_bga",
      source_component_id: "sc_bga",
      center: { x: 5, y: 0 },
      width: 6,
      height: 6,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_bga_b2",
      pcb_component_id: "pc_bga",
      source_port_id: "sp_bga_b2",
      x: 3,
      y: 2,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_bga_a1",
      pcb_component_id: "pc_bga",
      source_port_id: "sp_bga_a1",
      x: 7,
      y: -2,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToAssemblySvg(soup, {})
  const corners = getRenderedPin1IndicatorCornersByComponentName(svg)

  const uNum = corners.get("U_NUM")!
  expect(uNum.cornerX).toBeLessThan(uNum.centerX) // board -X (left)
  expect(uNum.cornerY).toBeLessThan(uNum.centerY) // board +Y -> SVG -Y (top)

  const uBga = corners.get("U_BGA")!
  expect(uBga.cornerX).toBeGreaterThan(uBga.centerX) // board +X (right)
  expect(uBga.cornerY).toBeGreaterThan(uBga.centerY) // board -Y -> SVG +Y (bottom)
})
