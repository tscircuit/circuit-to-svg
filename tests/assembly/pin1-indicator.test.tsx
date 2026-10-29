import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { parseSync, type INode } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

function findNodesByClass(node: INode, className: string): INode[] {
  const matches: INode[] = []
  if (node.attributes?.class === className) {
    matches.push(node)
  }
  for (const child of node.children ?? []) {
    matches.push(...findNodesByClass(child, className))
  }
  return matches
}

function getIndicatorCornerSigns(svg: string): [number, number] {
  const root = parseSync(svg)
  const indicators = findNodesByClass(root, "assembly-pin1-indicator")
  expect(indicators).toHaveLength(1)

  const indicator = indicators[0]!
  expect(indicator.attributes.transform).toBeUndefined()

  const firstPoint = indicator.attributes.points?.split(" ")[0]
  expect(firstPoint).toBeDefined()
  const [xStr, yStr] = firstPoint!.split(",")
  const x = Number.parseFloat(xStr!)
  const y = Number.parseFloat(yStr!)
  return [Math.sign(x), Math.sign(y)]
}

test("assembly pin1 indicator stays in pin1 corner across rotations", () => {
  // In the component group's local coordinate system (scale(1, -1)),
  // positive local Y points upward on the PCB (negative screen Y):
  // PCB top-left (rot 0) -> (-1, +1)
  // PCB bottom-left (rot 90) -> (-1, -1)
  // PCB bottom-right (rot 180) -> (+1, -1)
  // PCB top-right (rot 270) -> (+1, +1)
  const expectedSignsByRotation: Array<[number, [number, number]]> = [
    [0, [-1, 1]],
    [90, [-1, -1]],
    [180, [1, -1]],
    [270, [1, 1]],
  ]

  for (const [rotation, expectedSigns] of expectedSignsByRotation) {
    const { circuit } = getTestFixture()

    circuit.add(
      <board width="20mm" height="20mm">
        <chip
          name="U1"
          footprint="soic8"
          pcbX={0}
          pcbY={0}
          pcbRotation={rotation}
        />
      </board>,
    )

    const svg = convertCircuitJsonToAssemblySvg(
      circuit.getCircuitJson() as AnyCircuitElement[],
    )
    expect(getIndicatorCornerSigns(svg)).toEqual(expectedSigns)
  }
})

test("assembly pin1 indicator resolves pin1 via source_port when ports[0] is not pin1", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "J1",
      ftype: "simple_chip",
      are_pins_interchangeable: false,
    },
    {
      type: "source_port",
      source_port_id: "source_port_pin2",
      source_component_id: "source_component_0",
      name: "pin2",
      pin_number: 2,
      port_hints: ["2", "pin2"],
    },
    {
      type: "source_port",
      source_port_id: "source_port_pin1",
      source_component_id: "source_component_0",
      name: "pin1",
      pin_number: 1,
      port_hints: ["1", "pin1"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 90,
      width: 4,
      height: 8,
      obstructs_within_bounds: false,
    },
    // Intentionally place pin 2 first in soup (bottom-left of component)
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin2",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin2",
      x: -1.5,
      y: -3,
      layers: ["top"],
    },
    // Pin 1 is second in soup (top-right of component)
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin1",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin1",
      x: 1.5,
      y: 3,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToAssemblySvg(soup)
  // Pin 1 is at (x > center.x, y > center.y) -> PCB top-right -> (+w, +h) -> (+1, +1)
  expect(getIndicatorCornerSigns(svg)).toEqual([1, 1])
})
