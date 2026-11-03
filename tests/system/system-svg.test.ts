import { expect, test } from "bun:test"
import { any_circuit_element, type AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSystemSvg, CIRCUIT_TO_SVG_VERSION } from "lib"
import { parseSync, type INode } from "svgson"
import example from "../fixtures/system-block-example.json"

const circuit = example.map((e) => any_circuit_element.parse(e))

function nodes(node: INode): INode[] {
  return [node, ...node.children.flatMap(nodes)]
}

// svgson retains XML entities in parsed attribute strings.
function decodeAttribute(value: string | undefined): string | undefined {
  return value?.replace(
    /&(quot|apos|lt|gt|amp);/g,
    (_, entity: string) =>
      ({ quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" })[entity]!,
  )
}

function find(svg: string, attr: string, value: string, name?: string): INode {
  const node = nodes(parseSync(svg)).find(
    (n) =>
      decodeAttribute(n.attributes[attr]) === value &&
      (!name || n.name === name),
  )
  if (!node) throw new Error(`Missing SVG node: ${attr}=${value}`)
  return node
}

test("renders nested groups and resolved geometry without mutating the input", async () => {
  const input = structuredClone(circuit).reverse()
  const component = input.find((e) => e.type === "system_block_component")!
  if (component.type !== "system_block_component")
    throw new Error("Missing fixture block")
  component.pcb_component_ids = ["pcb_u3", "pcb_c1"]
  component.pcb_group_id = "pcb_main"
  const before = structuredClone(input)
  const svg = convertCircuitJsonToSystemSvg(input)
  expect(input).toEqual(before)
  expect(parseSync(svg).attributes).toMatchObject({
    width: "1000",
    height: "500",
    viewBox: "0 0 200 100",
  })
  expect(
    find(svg, "data-system-block-component-id", "sensor").children.find(
      (n) => n.name === "rect",
    )!.attributes,
  ).toMatchObject({ x: "22", y: "51", width: "40", height: "22" })
  expect(
    find(svg, "data-system-block-connection-id", "spi", "text").attributes,
  ).toMatchObject({ x: "133", y: "56" })
  expect(
    find(svg, "data-system-block-connection-id", "i2c", "g").children[0]!
      .attributes.points,
  ).toBe("62,62 80,62")
  expect(
    find(
      svg,
      "data-system-block-component-id",
      component.system_block_component_id,
    ).attributes,
  ).toMatchObject({
    "data-pcb-component-ids": "[&quot;pcb_u3&quot;,&quot;pcb_c1&quot;]",
    "data-pcb-group-id": "pcb_main",
  })
  const groupIds = nodes(parseSync(svg))
    .filter((n) => n.attributes.class === "system-block-group")
    .map((n) => n.attributes["data-system-block-group-id"])
  expect(groupIds).toEqual(["node", "processing"])
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "nested-groups")
})

function connectionFixture(): AnyCircuitElement[] {
  const records: AnyCircuitElement[] = [
    {
      type: "system_block_page",
      system_block_page_id: "connections",
      width: 200,
      height: 160,
      display_name: "Connection styles",
    },
  ]
  const states = [
    {
      is_signal: true,
      is_power: false,
      direction: "both",
      title: "Signal",
      label: "I2C",
    },
    {
      is_signal: false,
      is_power: true,
      direction: "forward",
      title: "Power",
      label: "3.3 V",
    },
    {
      is_signal: true,
      is_power: true,
      direction: "forward",
      title: "Signal + power",
      label: "Combined interface",
    },
    {
      is_signal: false,
      is_power: false,
      direction: "none",
      title: "Unclassified",
      label: "Mechanical link",
    },
  ] as const
  states.forEach((state, i) => {
    const y = 60 - i * 40
    records.push(
      {
        type: "system_block_component",
        system_block_component_id: `from_${i}`,
        system_block_page_id: "connections",
        display_name: state.title,
        description: `is_signal: ${state.is_signal}\nis_power: ${state.is_power}`,
        center: { x: -60, y },
        width: 50,
        height: 28,
      },
      {
        type: "system_block_component",
        system_block_component_id: `to_${i}`,
        system_block_page_id: "connections",
        display_name:
          state.direction === "both"
            ? "Bidirectional"
            : state.direction === "forward"
              ? "Forward"
              : "No arrows",
        center: { x: 60, y: y - 6 },
        width: 50,
        height: 28,
      },
      {
        type: "system_block_connection",
        system_block_connection_id: `link_${i}`,
        system_block_page_id: "connections",
        from_system_block_component_id: `from_${i}`,
        to_system_block_component_id: `to_${i}`,
        is_signal: state.is_signal,
        is_power: state.is_power,
        direction: state.direction,
        route: [
          { x: -35, y },
          { x: -10, y },
          { x: 10, y: y - 6 },
          { x: 35, y: y - 6 },
        ],
        label: state.label,
        label_anchor_center: { x: 0, y: y + 6 },
      },
    )
  })
  return records
}

test("draws all signal/power flags, arrow directions, and explicit route bends", async () => {
  const svg = convertCircuitJsonToSystemSvg(connectionFixture(), { width: 900 })
  expect(
    find(svg, "data-system-block-connection-id", "link_0", "g").children.filter(
      (n) => n.name === "polygon",
    ),
  ).toHaveLength(2)
  expect(
    find(svg, "data-system-block-connection-id", "link_1", "g").children.filter(
      (n) => n.name === "polygon",
    ),
  ).toHaveLength(1)
  expect(
    find(svg, "data-system-block-connection-id", "link_3", "g").children.filter(
      (n) => n.name === "polygon",
    ),
  ).toHaveLength(0)
  expect(
    find(svg, "data-system-block-connection-id", "link_2", "g").children[0]!
      .attributes,
  ).toMatchObject({
    points: "65,100 90,100 110,106 135,106",
    "stroke-dasharray": "2 1 0.5 1",
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "connections")
})

test("selects a page and applies custom colors and viewport dimensions", async () => {
  const input = [
    ...circuit,
    ...connectionFixture(),
    {
      type: "source_project_metadata" as const,
      software_used_string: "tscircuit test",
    },
  ]
  expect(
    parseSync(convertCircuitJsonToSystemSvg(input)).attributes[
      "data-system-block-page-id"
    ],
  ).toBe("overview")
  const svg = convertCircuitJsonToSystemSvg(input, {
    systemBlockPageId: "connections",
    width: 900,
    height: 800,
    includeVersion: true,
    colorOverrides: {
      background: "#15171b",
      componentFill: "#20252d",
      componentStroke: "#778399",
      groupFill: "#292f39",
      groupStroke: "#465267",
      text: "#e6e9ef",
      secondaryText: "#b9c3d2",
      signal: "#81b6f5",
      power: "#eab778",
      mixed: "#c6a3f2",
      connection: "#a0aab8",
    },
  })
  expect(parseSync(svg).attributes).toMatchObject({
    width: "900",
    height: "800",
    viewBox: "0 0 200 160",
    preserveAspectRatio: "xMidYMid meet",
    "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION,
    "data-software-used-string": "tscircuit test",
  })
  expect(
    nodes(parseSync(svg)).some(
      (n) => n.attributes["data-system-block-component-id"] === "sensor",
    ),
  ).toBe(false)
  expect(
    parseSync(convertCircuitJsonToSystemSvg(circuit, { height: 200 }))
      .attributes,
  ).toMatchObject({ width: "400", height: "200" })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "selected-page-dark")
})

test("wraps long block text in fixed bounds and escapes SVG text and metadata", async () => {
  const input: AnyCircuitElement[] = [
    {
      type: "system_block_page",
      system_block_page_id: "text",
      width: 120,
      height: 70,
    },
    {
      type: "system_block_component",
      system_block_component_id: 'block"<&',
      system_block_page_id: "text",
      display_name:
        "Environmental monitoring and wireless communication controller",
      description:
        "A very long purpose description that must stay within the supplied rectangle.\nIdentifierWithoutAnyWordBreaks1234567890",
      center: { x: -28, y: 10 },
      width: 48,
      height: 35,
      pcb_group_id: 'group"<&',
    },
    {
      type: "system_block_component",
      system_block_component_id: "escaped",
      system_block_page_id: "text",
      display_name: "Voltage < 5 V & current > 0",
      description:
        'Literal <script>alert("test")</script>\nCDATA ]]> then ]]> terminators',
      center: { x: 28, y: 10 },
      width: 48,
      height: 35,
    },
    {
      type: "system_block_component",
      system_block_component_id: "fallback",
      system_block_page_id: "text",
      center: { x: 0, y: -22 },
      width: 25,
      height: 10,
    },
  ]
  const svg = convertCircuitJsonToSystemSvg(input, { width: 900 })
  expect(nodes(parseSync(svg)).some((n) => n.name === "script")).toBe(false)
  expect(
    decodeAttribute(
      find(svg, "data-system-block-component-id", 'block"<&').attributes[
        "data-pcb-group-id"
      ],
    ),
  ).toBe('group"<&')
  expect(
    find(svg, "data-system-block-component-id", "fallback").children.find(
      (n) => n.name === "title",
    )!.children[0]!.value,
  ).toBe("fallback")
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "text-fitting")
})

test("renders vertical and self-loop arrowheads from the stored endpoints", async () => {
  const input: AnyCircuitElement[] = [
    {
      type: "system_block_page",
      system_block_page_id: "loops",
      width: 100,
      height: 100,
    },
    {
      type: "system_block_component",
      system_block_component_id: "top",
      system_block_page_id: "loops",
      display_name: "Controller",
      center: { x: -15, y: 20 },
      width: 40,
      height: 20,
    },
    {
      type: "system_block_component",
      system_block_component_id: "bottom",
      system_block_page_id: "loops",
      display_name: "Peripheral",
      center: { x: -15, y: -20 },
      width: 40,
      height: 20,
    },
    {
      type: "system_block_connection",
      system_block_connection_id: "vertical",
      system_block_page_id: "loops",
      from_system_block_component_id: "top",
      to_system_block_component_id: "bottom",
      is_signal: true,
      is_power: false,
      direction: "both",
      route: [
        { x: -15, y: 10 },
        { x: -15, y: -10 },
      ],
      label: "Control",
      label_anchor_center: { x: -26, y: 0 },
    },
    {
      type: "system_block_connection",
      system_block_connection_id: "loop",
      system_block_page_id: "loops",
      from_system_block_component_id: "top",
      to_system_block_component_id: "top",
      is_signal: true,
      is_power: false,
      direction: "forward",
      route: [
        { x: -15, y: 30 },
        { x: -15, y: 40 },
        { x: 30, y: 40 },
        { x: 30, y: 20 },
        { x: 5, y: 20 },
      ],
      label: "Feedback",
      label_anchor_center: { x: 6, y: 44 },
    },
  ]
  await expect(
    convertCircuitJsonToSystemSvg(input, { width: 650 }),
  ).toMatchSvgSnapshot(import.meta.path, "loops-and-vertical")
})

test("rejects missing pages, invalid geometry, and inconsistent selected-page references", () => {
  expect(() => convertCircuitJsonToSystemSvg([])).toThrow("system_block_page")
  expect(() =>
    convertCircuitJsonToSystemSvg(circuit, { systemBlockPageId: "missing" }),
  ).toThrow("not found")
  for (const width of [0, -1, Infinity, NaN])
    expect(() => convertCircuitJsonToSystemSvg(circuit, { width })).toThrow(
      "positive finite",
    )
  for (const height of [0, -1, Infinity, NaN])
    expect(() => convertCircuitJsonToSystemSvg(circuit, { height })).toThrow(
      "positive finite",
    )
  const withChange = (
    type: AnyCircuitElement["type"],
    patch: Record<string, unknown>,
  ) =>
    circuit.map((e) =>
      e.type === type ? ({ ...e, ...patch } as AnyCircuitElement) : e,
    )
  expect(() =>
    convertCircuitJsonToSystemSvg(
      withChange("system_block_component", { width: undefined }),
    ),
  ).toThrow()
  expect(() =>
    convertCircuitJsonToSystemSvg(
      withChange("system_block_connection", { label_anchor_center: undefined }),
    ),
  ).toThrow()
  expect(() =>
    convertCircuitJsonToSystemSvg(
      withChange("system_block_connection", {
        route: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      }),
    ),
  ).toThrow()
  expect(() =>
    convertCircuitJsonToSystemSvg(
      withChange("system_block_component", {
        system_block_group_id: "other-page-group",
      }),
    ),
  ).toThrow("not found on selected page")
  expect(() =>
    convertCircuitJsonToSystemSvg(
      withChange("system_block_connection", {
        to_system_block_component_id: "missing",
      }),
    ),
  ).toThrow("endpoint not found")
  expect(() =>
    convertCircuitJsonToSystemSvg([...circuit, circuit[3]!]),
  ).toThrow("Duplicate")
  expect(() =>
    convertCircuitJsonToSystemSvg([...circuit, circuit[0]!]),
  ).toThrow("Duplicate")
  const cycle = circuit.map((e) =>
    e.type === "system_block_group" && e.system_block_group_id === "node"
      ? { ...e, parent_system_block_group_id: "processing" }
      : e,
  )
  expect(() => convertCircuitJsonToSystemSvg(cycle)).toThrow("Cyclic")
  // Unselected pages do not have to be ready for rendering yet.
  const malformedOtherPage = connectionFixture().map((e) =>
    e.type === "system_block_connection" ? { ...e, route: [] } : e,
  )
  expect(() =>
    convertCircuitJsonToSystemSvg([...circuit, ...malformedOtherPage]),
  ).not.toThrow()
})
