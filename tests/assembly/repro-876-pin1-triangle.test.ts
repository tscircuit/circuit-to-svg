import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib"

// Reproduces https://github.com/tscircuit/circuit-to-svg/issues/876
const getCircuitJson = () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      name: "U1",
      ftype: "simple_chip",
      are_pins_interchangeable: false,
    },
    {
      type: "source_component",
      source_component_id: "source_component_2",
      name: "U2",
      ftype: "simple_chip",
      are_pins_interchangeable: false,
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: -10, y: 0 },
      width: 10,
      height: 6,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_2",
      source_component_id: "source_component_2",
      center: { x: 10, y: 0 },
      width: 10,
      height: 6,
      rotation: 90,
      layer: "top",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      pcb_component_id: "pcb_component_1",
      x: -5,
      y: -3,
      layers: ["top"],
      port_hints: ["2"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_1",
      x: -15,
      y: -3,
      layers: ["top"],
      port_hints: ["1"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_4",
      pcb_component_id: "pcb_component_2",
      x: 13,
      y: -5,
      layers: ["top"],
      port_hints: ["1"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_3",
      pcb_component_id: "pcb_component_2",
      x: 13,
      y: 5,
      layers: ["top"],
      port_hints: ["2"],
    },
  ] as any
  return circuitJson
}

const getSvg = () => {
  return convertCircuitJsonToAssemblySvg(getCircuitJson(), {
    width: 400,
    height: 300,
  })
}

test("assembly pin-1 indicator repro snapshot", () => {
  expect(getSvg()).toMatchSvgSnapshot(import.meta.path)
})

test.failing(
  "assembly pin-1 indicator uses pin 1 instead of the first pcb_port",
  () => {
    const svg = getSvg()
    const indicators = [
      ...svg.matchAll(/<polygon[^>]*class="assembly-pin1-indicator"[^>]*>/g),
    ]

    expect(indicators).toHaveLength(2)
    const points = indicators[0][0].match(/points="([^"]+)"/)?.[1]
    expect(points).toBeDefined()

    const xCoordinates = points!.split(" ").map((point) => {
      return Number(point.split(",")[0])
    })

    expect(xCoordinates.every((x) => x < 0)).toBe(true)
  },
)
