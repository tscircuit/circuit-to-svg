import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { parseSync } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

function getPin1IndicatorCornerInBoardSide(svg: string): {
  isLeft: boolean
  isTopOnBoard: boolean
  points: [number, number][]
} {
  const root = parseSync(svg)
  const findPin1 = (node: any): any => {
    if (
      node.name === "polygon" &&
      node.attributes?.class === "assembly-pin1-indicator"
    ) {
      return node
    }
    for (const child of node.children ?? []) {
      const found = findPin1(child)
      if (found) return found
    }
    return null
  }
  const poly = findPin1(root)
  expect(poly).not.toBeNull()
  expect(poly.attributes.transform).toBe("rotate(0)")

  const pts = (poly.attributes.points as string)
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number) as [number, number])
  const [cornerX, cornerY] = pts[0]!
  return {
    isLeft: cornerX < 0,
    // Inside <g transform="translate(x, y) scale(1, -1)">, +Y is board +Y (top on board)
    isTopOnBoard: cornerY > 0,
    points: pts,
  }
}

test("assembly pin-1 indicator selects pin 1 / A1 port when ports[0] is not pin 1", () => {
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
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    // First port in soup is pin 4 at bottom-right (+2, -1.5)
    {
      type: "source_port",
      source_port_id: "source_port_pin4",
      source_component_id: "source_component_0",
      name: "OUT",
      pin_number: 4,
      port_hints: ["pin4", "4"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin4",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin4",
      x: 2,
      y: -1.5,
      layers: ["top"],
    },
    // Second port in soup is pin 1 at top-left (-2, +1.5)
    {
      type: "source_port",
      source_port_id: "source_port_pin1",
      source_component_id: "source_component_0",
      name: "IN",
      pin_number: 1,
      port_hints: ["pin1", "1"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin1",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin1",
      x: -2,
      y: 1.5,
      layers: ["top"],
    },
  ]

  const svg = convertCircuitJsonToAssemblySvg(soup)
  const indicator = getPin1IndicatorCornerInBoardSide(svg)
  expect(indicator.isLeft).toBe(true)
  expect(indicator.isTopOnBoard).toBe(true)
})

test("assembly pin-1 indicator does not double-apply rotation for rotated chips", () => {
  const expectedCorners: Array<{
    rotation: number
    isLeft: boolean
    isTopOnBoard: boolean
  }> = [
    { rotation: 0, isLeft: true, isTopOnBoard: true },
    { rotation: 90, isLeft: true, isTopOnBoard: false },
    { rotation: 180, isLeft: false, isTopOnBoard: false },
    { rotation: 270, isLeft: false, isTopOnBoard: true },
  ]

  for (const { rotation, isLeft, isTopOnBoard } of expectedCorners) {
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
    const indicator = getPin1IndicatorCornerInBoardSide(svg)
    expect(indicator.isLeft).toBe(isLeft)
    expect(indicator.isTopOnBoard).toBe(isTopOnBoard)
  }
})
