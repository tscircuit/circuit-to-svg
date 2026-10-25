import { expect } from "bun:test"
import type { AnyCircuitElement, Point } from "circuit-json"
import { any_circuit_element } from "circuit-json"
import { type INode, parseSync } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  fromDefinition,
  fromTransformAttribute,
  identity,
  scale,
  translate,
} from "transformation-matrix"
import { getTestFixture } from "./get-test-fixture"

type Metadata = "number" | "hint" | "a1" | "legacy"
type Spec = {
  name: string
  x: number
  y: number
  rotation: number
  layer: "top" | "bottom"
  metadata: Metadata
  caption: string
}
type Reference = Spec & {
  center: Point
  width: number
  height: number
  pin1: Point
}

/** Reference points come from real placed Circuit ports named ONE, not the renderer's pin-selection helper. */
export async function createAssemblyPin1Fixture(kind: "metadata" | "rotation") {
  const specs: Spec[] =
    kind === "metadata"
      ? (["legacy", "number", "hint", "a1"] as const).map(
          (metadata, index) => ({
            name: `U${index + 1}`,
            x: -15 + index * 10,
            y: 0,
            rotation: 0,
            layer: "top",
            metadata,
            caption: {
              legacy: "Legacy first port",
              number: "Source pin number",
              hint: "Source pin hint",
              a1: "A1 hint",
            }[metadata],
          }),
        )
      : (["top", "bottom"] as const).flatMap((layer, row) =>
          [0, 90, 180, 270].map((rotation, column) => ({
            name: `U${row * 4 + column + 1}`,
            x: -15 + column * 10,
            y: row === 0 ? 6 : -6,
            rotation,
            layer,
            metadata: "number" as const,
            caption: `${layer} ${rotation}°`,
          })),
        )
  const { circuit } = getTestFixture()
  circuit.add(
    <board width={46} height={kind === "metadata" ? 12 : 30} routingDisabled>
      {specs.map((spec) => (
        <chip
          key={spec.name}
          name={spec.name}
          footprint="dip4"
          pcbX={spec.x}
          pcbY={spec.y}
          pcbRotation={spec.rotation}
          layer={spec.layer}
          pinLabels={{ pin1: "ONE", pin2: "TWO", pin3: "THREE", pin4: "FOUR" }}
        />
      ))}
      {kind === "rotation" && (
        <resistor
          name="R1"
          resistance="1k"
          footprint="0805"
          pcbX={0}
          pcbY={0}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  const rendered = circuit.getCircuitJson()
  const references: Reference[] = specs.map((spec) => {
    const sourceComponent = rendered.find(
      (element) =>
        element.type === "source_component" && element.name === spec.name,
    )
    if (!sourceComponent || sourceComponent.type !== "source_component")
      throw new Error(`Missing ${spec.name} in fixture`)
    const component = rendered.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === sourceComponent.source_component_id,
    )
    const sourcePin1 = rendered.find(
      (element) =>
        element.type === "source_port" &&
        element.source_component_id === sourceComponent.source_component_id &&
        element.name === "ONE",
    )
    if (
      !component ||
      component.type !== "pcb_component" ||
      !sourcePin1 ||
      sourcePin1.type !== "source_port"
    )
      throw new Error(`Missing placed pin ONE for ${spec.name}`)
    const pin1 = rendered.find(
      (element) =>
        element.type === "pcb_port" &&
        element.pcb_component_id === component.pcb_component_id &&
        element.source_port_id === sourcePin1.source_port_id,
    )
    if (!pin1 || pin1.type !== "pcb_port")
      throw new Error(`Missing PCB pin ONE for ${spec.name}`)
    return {
      ...spec,
      center: { ...component.center },
      width: component.width,
      height: component.height,
      pin1: { x: pin1.x, y: pin1.y },
    }
  })
  const sourceNames = new Map(
    rendered
      .filter((element) => element.type === "source_component")
      .map((element) => [element.source_component_id, element.name] as const),
  )
  const metadataByName = new Map(
    specs.map((spec) => [spec.name, spec.metadata] as const),
  )
  // The pin-marker contract needs placed bounds and ports; exclude unrelated
  // pad/hole shape encodings from the newer Core output.
  const relevantTypes = new Set([
    "pcb_board",
    "pcb_component",
    "source_component",
    "pcb_port",
    "source_port",
  ])
  const data: AnyCircuitElement[] = rendered
    .filter((element) => relevantTypes.has(element.type))
    .flatMap((original): AnyCircuitElement[] => {
      // Core emits numeric display offsets while this package pins a schema
      // that models them as unit strings. They are irrelevant to assembly;
      // preserve placed geometry and omit only that optional display metadata.
      const element = { ...original }
      if ("display_offset_x" in element) element.display_offset_x = undefined
      if ("display_offset_y" in element) element.display_offset_y = undefined
      if (element.type !== "source_port") return [element]
      const name = element.source_component_id
        ? sourceNames.get(element.source_component_id)
        : undefined
      const metadata = name ? metadataByName.get(name) : undefined
      if (metadata === "legacy") return []
      if (metadata === "number") return [{ ...element, port_hints: [] }]
      if (metadata === "hint" || metadata === "a1") {
        const { pin_number, ...withoutNumber } = element
        return [
          {
            ...withoutNumber,
            port_hints:
              metadata === "a1"
                ? element.name === "ONE"
                  ? ["A1", "ONE"]
                  : [element.name]
                : (element.port_hints ?? []).filter(
                    (hint) => !/^\d+$/.test(hint),
                  ),
          },
        ]
      }
      return [element]
    })
  // Reverse only PCB-port order for metadata-bearing components. The legacy
  // control intentionally keeps the same first port as the existing API.
  const ports = data.filter((element) => element.type === "pcb_port")
  const orderedPorts = specs.flatMap((spec) => {
    const source = data.find(
      (element) =>
        element.type === "source_component" && element.name === spec.name,
    )
    const component = data.find(
      (element) =>
        element.type === "pcb_component" &&
        source?.type === "source_component" &&
        element.source_component_id === source.source_component_id,
    )
    const placed = ports.filter(
      (port) =>
        component?.type === "pcb_component" &&
        port.pcb_component_id === component.pcb_component_id,
    )
    return spec.metadata === "legacy" || kind === "rotation"
      ? placed
      : placed.reverse()
  })
  const selectedIds = new Set(orderedPorts.map((port) => port.pcb_port_id))
  const soup = [
    ...data.filter((element) => element.type !== "pcb_port"),
    ...orderedPorts,
    ...ports.filter((port) => !selectedIds.has(port.pcb_port_id)),
  ]
  for (const element of soup) any_circuit_element.parse(element)
  const width = 960
  const height = kind === "metadata" ? 280 : 640
  // Both fixtures use a centered board, one millimeter padding, and exactly
  // 20 pixels/mm. This reference projection is independent of marker logic.
  const worldToSvg = compose(translate(width / 2, height / 2), scale(20, -20))
  return {
    soup,
    references,
    width,
    height,
    worldToSvg,
    interchangeable: kind === "rotation" ? "R1" : undefined,
  }
}

type Fixture = Awaited<ReturnType<typeof createAssemblyPin1Fixture>>

function actualMarkers(svg: string) {
  const corners = new Map<string, Point>()
  const componentNames = new Set<string>()
  const visit = (node: INode, parent: Matrix, componentName?: string) => {
    const matrix = node.attributes.transform
      ? compose(
          parent,
          compose(
            ...fromDefinition(
              fromTransformAttribute(node.attributes.transform),
            ),
          ),
        )
      : parent
    const label = node.children.find(
      (child) => child.attributes?.class === "assembly-component-label",
    )
    const name = label
      ? label.children.map((child) => child.value ?? "").join("")
      : componentName
    if (label && name) componentNames.add(name)
    if (node.attributes.class === "assembly-pin1-indicator") {
      const points = node.attributes.points
      if (!points || !name)
        throw new Error("Assembly marker has no point or component label")
      const [x = Number.NaN, y = Number.NaN] = points
        .trim()
        .split(/\s+/)[0]!
        .split(",")
        .map(Number)
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      expect(corners.has(name)).toBe(false)
      corners.set(name, applyToPoint(matrix, { x, y }))
    }
    for (const child of node.children) visit(child, matrix, name)
  }
  visit(parseSync(svg), identity())
  return { corners, componentNames }
}

/** Assert on the fully transformed emitted polygon, using physical pin ONE as the independent oracle. */
export function expectAssemblyPin1AtPlacedPorts(svg: string, fixture: Fixture) {
  const actual = actualMarkers(svg)
  expect(actual.corners.size).toBe(fixture.references.length)
  for (const reference of fixture.references) {
    const corner = actual.corners.get(reference.name)
    expect(corner, reference.caption).toBeDefined()
    if (!corner) throw new Error(`Missing marker for ${reference.name}`)
    const pin1 = applyToPoint(fixture.worldToSvg, reference.pin1)
    const corners = [-1, 1].flatMap((xSign) =>
      [-1, 1].map((ySign) =>
        applyToPoint(fixture.worldToSvg, {
          x: reference.center.x + (xSign * reference.width) / 2,
          y: reference.center.y + (ySign * reference.height) / 2,
        }),
      ),
    )
    const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
    expect(
      Math.min(...corners.map((candidate) => distance(corner, candidate))),
      `${reference.caption}: marker is on the rendered bounds`,
    ).toBeLessThan(0.000001)
    expect(
      distance(corner, pin1),
      `${reference.caption}: marker is nearest placed pin ONE`,
    ).toBeLessThanOrEqual(
      Math.min(...corners.map((candidate) => distance(candidate, pin1))) +
        0.000001,
    )
  }
  if (fixture.interchangeable) {
    expect(actual.componentNames.has(fixture.interchangeable)).toBe(true)
    expect(actual.corners.has(fixture.interchangeable)).toBe(false)
    expect(
      fixture.soup.find(
        (element) =>
          element.type === "source_component" &&
          element.name === fixture.interchangeable,
      ),
    ).toMatchObject({ are_pins_interchangeable: true })
  }
}

/** Overlay only test reference labels at actual emitted pins; assertions inspect the raw renderer output above. */
export function annotateAssemblyPin1References(svg: string, fixture: Fixture) {
  const annotations = fixture.references
    .map((reference) => {
      const pin1 = applyToPoint(fixture.worldToSvg, reference.pin1)
      const caption = applyToPoint(fixture.worldToSvg, {
        x: reference.center.x,
        y: reference.center.y + reference.height / 2 + 0.8,
      })
      return `<g class="fixture-pin-reference"><circle cx="${pin1.x}" cy="${pin1.y}" r="5" fill="none" stroke="#008000" stroke-width="2"/><text x="${pin1.x + 7}" y="${pin1.y - 5}" fill="#006400" font-family="Arial" font-size="12">1</text><text x="${caption.x}" y="${caption.y}" text-anchor="middle" fill="#006400" font-family="Arial" font-size="12">${reference.caption}</text></g>`
    })
    .join("")
  const end = svg.lastIndexOf("</svg>")
  if (end < 0) throw new Error("Assembly fixture has no SVG root closing tag")
  return svg.slice(0, end) + annotations + svg.slice(end)
}
