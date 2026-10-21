import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { PcbTraceRoutePoint } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("route-only vias should match physical vias with the same dimensions", () => {
  const route = [
    { route_type: "wire", x: 3, y: 0, width: 0.2, layer: "top" },
    { route_type: "wire", x: 6, y: 0, width: 0.2, layer: "top" },
    {
      route_type: "via",
      x: 6,
      y: 0,
      from_layer: "top",
      to_layer: "bottom",
      outer_diameter: 2,
      hole_diameter: 1,
    },
  ] satisfies PcbTraceRoutePoint[]
  const circuit = new Circuit()
  circuit.add(
    <board width={28} height={12}>
      <via
        pcbX={-6}
        pcbY={0}
        fromLayer="top"
        toLayer="bottom"
        outerDiameter={2}
        holeDiameter={1}
      />
      <pcbtrace route={route} />
      <pcbnotetext
        pcbX={0}
        pcbY={4}
        layer="top"
        fontSize={0.7}
        text="BOTH: 2 mm PAD / 1 mm DRILL"
      />
      <pcbnotetext
        pcbX={-6}
        pcbY={2}
        layer="top"
        fontSize={0.6}
        text="EXPECTED: PHYSICAL VIA"
      />
      <pcbnotetext
        pcbX={6}
        pcbY={2}
        layer="top"
        fontSize={0.6}
        text="ACTUAL: ROUTE ONLY"
      />
      <pcbnotetext
        pcbX={0}
        pcbY={-3}
        layer="top"
        fontSize={0.6}
        text="The copper rings and pink drills should match"
      />
    </board>,
  )
  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    width: 1200,
    height: 600,
    showPcbNotes: true,
    backgroundColor: "#0f172a",
    includeVersion: false,
    shouldDrawErrors: false,
    shouldDrawRatsNest: false,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
