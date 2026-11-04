import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SystemBlockConnection,
  SystemBlockRoutePoint,
} from "circuit-json"
import { convertCircuitJsonToSystemSvg } from "lib"
import { parseSync, type INode } from "svgson"

const page: AnyCircuitElement = {
  type: "system_block_page",
  system_block_page_id: "curves",
  width: 180,
  height: 160,
}

function block(
  id: string,
  x: number,
  y: number,
  height = 20,
): AnyCircuitElement {
  return {
    type: "system_block_component",
    system_block_component_id: id,
    system_block_page_id: "curves",
    display_name: id,
    center: { x, y },
    width: 40,
    height,
  }
}

function connection(
  id: string,
  from: string,
  to: string,
  route: SystemBlockRoutePoint[],
  extra: Partial<SystemBlockConnection> = {},
): SystemBlockConnection {
  return {
    type: "system_block_connection",
    system_block_connection_id: id,
    system_block_page_id: "curves",
    from_system_block_component_id: from,
    to_system_block_component_id: to,
    is_signal: true,
    is_power: false,
    direction: "both",
    route,
    ...extra,
  }
}

function group(svg: string, id: string): INode {
  return parseSync(svg).children.find(
    (node) =>
      node.name === "g" &&
      node.attributes["data-system-block-connection-id"] === id,
  )!
}

// Quarter-circle handle distance for radius 12, not quadratic corner smoothing.
const h = (4 / 3) * Math.tan(Math.PI / 8) * 12
const roundedCircuit: AnyCircuitElement[] = [
  page,
  block("Sensor", -60, 45),
  block("Processor", 60, 15),
  block("Controller", -50, -34, 40),
  block("Monitor", 55, -40),
  connection(
    "rounded",
    "Sensor",
    "Processor",
    [
      { x: -40, y: 45 },
      { x: -12, y: 45 },
      {
        x: 0,
        y: 33,
        cubic_bezier_control_points: [
          { x: -12 + h, y: 45 },
          { x: 0, y: 33 + h },
        ],
      },
      { x: 0, y: 27 },
      {
        x: 12,
        y: 15,
        cubic_bezier_control_points: [
          { x: 0, y: 27 - h },
          { x: 12 - h, y: 15 },
        ],
      },
      { x: 40, y: 15 },
    ],
    { label: "Rounded circular corners", label_anchor_center: { x: 0, y: 55 } },
  ),
  connection(
    "return",
    "Controller",
    "Controller",
    [
      { x: -30, y: -22 },
      { x: 0, y: -22 },
      {
        x: 12,
        y: -34,
        cubic_bezier_control_points: [
          { x: h, y: -22 },
          { x: 12, y: -34 + h },
        ],
      },
      {
        x: 0,
        y: -46,
        cubic_bezier_control_points: [
          { x: 12, y: -34 - h },
          { x: h, y: -46 },
        ],
      },
      { x: -30, y: -46 },
    ],
    {
      is_power: true,
      is_signal: false,
      direction: "forward",
      label: "Semicircular return",
      label_anchor_center: { x: -12, y: -62 },
    },
  ),
  connection(
    "closed",
    "Monitor",
    "Monitor",
    [
      { x: 55, y: -30 },
      {
        x: 55,
        y: -30,
        cubic_bezier_control_points: [
          { x: 15, y: 10 },
          { x: 95, y: 10 },
        ],
      },
    ],
    {
      is_power: true,
      label: "Closed cubic loop",
      label_anchor_center: { x: 55, y: 2 },
    },
  ),
]

test("renders circular corners, a semicircular return, and a closed cubic loop", async () => {
  const original = structuredClone(roundedCircuit)
  const svg = convertCircuitJsonToSystemSvg(roundedCircuit, { width: 900 })
  expect(roundedCircuit).toEqual(original)
  expect(group(svg, "rounded").children[0]!.attributes.d).toBe(
    "M 50,35 L 78,35 C 84.627417,35 90,40.372583 90,47 L 90,53 C 90,59.627417 95.372583,65 102,65 L 130,65",
  )
  expect(group(svg, "return").children[0]!.attributes["stroke-dasharray"]).toBe(
    "2 1",
  )
  expect(group(svg, "closed").children[0]!.attributes["stroke-dasharray"]).toBe(
    "2 1 0.5 1",
  )
  // Controls and endpoints both undergo the page translation and Y flip.
  expect(group(svg, "closed").children[0]!.attributes.d).toBe(
    "M 145,110 C 105,70 185,70 145,110",
  )
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "circular-corners-and-loops",
  )
})

test("arrows follow endpoint tangents with coincident or tiny handles", async () => {
  const input: AnyCircuitElement[] = [page]
  const cases = [
    { name: "Tangent", dx1: 0, dy1: 14, dx2: 0, dy2: -14, direction: "both" },
    { name: "Coincident", dx1: 0, dy1: 0, dx2: 0, dy2: 0, direction: "both" },
    {
      name: "Tiny handle",
      dx1: 0,
      dy1: 0.001,
      dx2: 0,
      dy2: -0.001,
      direction: "both",
    },
    { name: "No arrows", dx1: 0, dy1: 14, dx2: 0, dy2: -14, direction: "none" },
  ] as const
  for (const [i, c] of cases.entries()) {
    const y = 60 - i * 40
    input.push(block(c.name, -60, y), block(`Target ${i}`, 60, y))
    input.push(
      connection(
        `route_${c.name}`,
        c.name,
        `Target ${i}`,
        [
          { x: -40, y },
          {
            x: 40,
            y,
            cubic_bezier_control_points: [
              { x: -40 + c.dx1, y: y + c.dy1 },
              { x: 40 + c.dx2, y: y + c.dy2 },
            ],
          },
        ],
        { direction: c.direction, is_signal: false },
      ),
    )
  }
  const svg = convertCircuitJsonToSystemSvg(input, { width: 900 })
  const arrows = (id: string) =>
    group(svg, `route_${id}`)
      .children.filter((n) => n.name === "polygon")
      .map((n) => n.attributes.points)
  expect(arrows("Tangent")).toEqual([
    "130,20 130.9,22 129.1,22",
    "50,20 49.1,18 50.9,18",
  ])
  expect(arrows("Coincident")).toEqual([
    "130,60 128,60.9 128,59.1",
    "50,60 52,59.1 52,60.9",
  ])
  expect(arrows("Tiny handle")).toEqual([
    "130,100 130.9,102 129.1,102",
    "50,100 49.1,98 50.9,98",
  ])
  expect(arrows("No arrows")).toEqual([])
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "cubic-tangent-arrowheads",
  )
})

test("falls back to the opposite endpoint when both handles coincide with an endpoint", () => {
  for (const handle of [
    { x: -40, y: 0 },
    { x: 40, y: 0 },
  ]) {
    const svg = convertCircuitJsonToSystemSvg([
      page,
      block("A", -60, 0),
      block("B", 60, 0),
      connection("fallback", "A", "B", [
        { x: -40, y: 0 },
        { x: 40, y: 0, cubic_bezier_control_points: [handle, handle] },
      ]),
    ])
    expect(
      group(svg, "fallback")
        .children.filter((n) => n.name === "polygon")
        .map((n) => n.attributes.points),
    ).toEqual(["130,80 128,80.9 128,79.1", "50,80 52,79.1 52,80.9"])
  }
})

test("rejects malformed curves instead of silently rendering straight segments", () => {
  for (const route of [
    [
      {
        x: 0,
        y: 0,
        cubic_bezier_control_points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      },
      { x: 10, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 10, y: 0, cubic_bezier_control_points: [{ x: 1, y: 1 }] },
    ],
    [
      { x: 0, y: 0 },
      {
        x: 10,
        y: 0,
        cubic_bezier_control_points: [
          { x: Infinity, y: 1 },
          { x: 2, y: 2 },
        ],
      },
    ],
    [
      { x: 0, y: 0 },
      {
        x: 0,
        y: 0,
        cubic_bezier_control_points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      },
    ],
  ]) {
    expect(() =>
      convertCircuitJsonToSystemSvg([
        page,
        block("A", -60, 0),
        block("B", 60, 0),
        connection("invalid", "A", "B", route as SystemBlockRoutePoint[]),
      ]),
    ).toThrow()
  }
})
