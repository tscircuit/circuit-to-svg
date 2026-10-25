import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToAssemblySvg } from "lib/index"

const PIN_ONE_HINTS = ["pin1", "pin_1", "1", "a1"]

function pin1CornerSigns(svg: string): { x: number; y: number } {
  const tag = svg.match(/<polygon[^>]*assembly-pin1-indicator[^>]*>/)?.[0]
  if (!tag) throw new Error("no pin-1 indicator in svg")
  const points = tag.match(/points="([^"]+)"/)?.[1]
  if (!points) throw new Error("pin-1 indicator has no points")
  const [rawX, rawY] = points.split(" ")[0].split(",").map(Number)

  // Honour whatever transform the polygon carries, so a triangle that is drawn
  // on the right corner and then rotated onto the wrong one still fails.
  const degrees = Number(tag.match(/rotate\((-?[\d.]+)/)?.[1] ?? 0)
  const rad = (degrees * Math.PI) / 180
  const x = rawX * Math.cos(rad) - rawY * Math.sin(rad)
  const y = rawX * Math.sin(rad) + rawY * Math.cos(rad)
  return { x: Math.sign(x), y: Math.sign(y) }
}

for (const rotation of [0, 90, 180, 270]) {
  test(`pin-1 indicator sits on pin 1's corner at ${rotation}°`, () => {
    const { circuit } = getTestFixture()
    circuit.add(
      <board width="20mm" height="20mm">
        <chip
          name="U1"
          footprint="dip4"
          pcbX={0}
          pcbY={0}
          pcbRotation={rotation}
        />
      </board>,
    )
    const circuitJson = circuit.getCircuitJson() as any
    const component = circuitJson.find(
      (elm: any) => elm.type === "pcb_component",
    )
    const sourcePorts = circuitJson.filter(
      (elm: any) => elm.type === "source_port",
    )
    const ports = circuitJson.filter(
      (elm: any) =>
        elm.type === "pcb_port" &&
        elm.pcb_component_id === component.pcb_component_id,
    )
    const pin1 = ports.find((port: any) => {
      const sourcePort = sourcePorts.find(
        (sp: any) => sp.source_port_id === port.source_port_id,
      )
      const hints = (sourcePort?.port_hints ?? []).map((h: string) =>
        h.toLowerCase(),
      )
      return hints.some((hint: string) => PIN_ONE_HINTS.includes(hint))
    })
    expect(pin1).toBeDefined()

    // The group applies scale(1, -1), so the polygon's local y sign is the
    // opposite of the port's board y offset.
    const expectedX = Math.sign(pin1.x - component.center.x)
    const expectedY = Math.sign(pin1.y - component.center.y)

    const corners = pin1CornerSigns(
      convertCircuitJsonToAssemblySvg(circuitJson, {}),
    )
    expect(corners.x).toBe(expectedX)
    expect(corners.y).toBe(expectedY)
  })
}

test("pin 1 is resolved from port hints, not from port order", () => {
  const circuitJson: any[] = [
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
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "source_port_pin2",
      source_component_id: "source_component_0",
      name: "pin2",
      port_hints: ["pin2", "2"],
    },
    {
      type: "source_port",
      source_port_id: "source_port_pin1",
      source_component_id: "source_component_0",
      name: "pin1",
      port_hints: ["pin1", "1"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      rotation: 0,
      layer: "top",
    },
    // pin 2 deliberately comes first, the way render order can put it there
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin2",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin2",
      x: 2,
      y: 2,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_pin1",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_pin1",
      x: -2,
      y: 2,
      layers: ["top"],
    },
  ]
  const corners = pin1CornerSigns(
    convertCircuitJsonToAssemblySvg(circuitJson as any, {}),
  )
  // pin 1 sits top-left in the board frame; pin 2 (right) must not be chosen
  expect(corners.x).toBe(-1)
  expect(corners.y).toBe(1)
})
