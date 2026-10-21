import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { PcbTraceRoutePoint } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

function createRouteTrace(x = 0) {
  const route = [
    { route_type: "wire", x: x - 3, y: 0, width: 0.2, layer: "top" },
    { route_type: "wire", x, y: 0, width: 0.2, layer: "top" },
    {
      route_type: "via",
      x,
      y: 0,
      from_layer: "top",
      to_layer: "bottom",
      outer_diameter: 2,
      hole_diameter: 1,
    },
  ] satisfies PcbTraceRoutePoint[]
  return <pcbtrace route={route} />
}

function createPhysicalVia(x = 0) {
  return (
    <via
      pcbX={x}
      pcbY={0}
      fromLayer="top"
      toLayer="bottom"
      outerDiameter={2}
      holeDiameter={1}
    />
  )
}

function createNote({
  text,
  x,
  y,
  fontSize = 0.7,
}: {
  text: string
  x: number
  y: number
  fontSize?: number
}) {
  return (
    <pcbnotetext
      pcbX={x}
      pcbY={y}
      layer="top"
      fontSize={fontSize}
      text={text}
    />
  )
}

function getViaRadii(svg: string) {
  return [
    ...svg.matchAll(
      /<circle[^>]*class="pcb-hole-(outer|inner)"[^>]*\br="([^"]+)"[^>]*data-type="pcb_via"/g,
    ),
  ].map((circle) => ({ part: circle[1], radius: Number(circle[2]) }))
}

function renderRouteOnlyVia() {
  const circuit = new Circuit()
  circuit.add(
    <board width={30} height={14}>
      {createRouteTrace()}
    </board>,
  )
  return convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    includeVersion: false,
  })
}

function renderPhysicalViaControl() {
  const circuit = new Circuit()
  circuit.add(
    <board width={30} height={14}>
      {createRouteTrace()}
      {createPhysicalVia()}
    </board>,
  )
  return convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    includeVersion: false,
  })
}

test.failing(
  "route-only vias preserve their explicit pad and drill diameters",
  () => {
    expect(getViaRadii(renderRouteOnlyVia())).toEqual(
      getViaRadii(renderPhysicalViaControl()),
    )
  },
)

test("route-only via dimensions: expected physical via and actual route-only input", () => {
  // Both inputs request the same 2 mm pad / 1 mm drill. The independent
  // control supplies its physical via directly; the actual input does not.
  expect(getViaRadii(renderRouteOnlyVia())).toHaveLength(2)
  expect(getViaRadii(renderPhysicalViaControl())).toHaveLength(2)
  const circuit = new Circuit()
  circuit.add(
    <board width={30} height={14}>
      {createRouteTrace(-7)}
      {createPhysicalVia(-7)}
      {createRouteTrace(7)}
      {createNote({
        text: "ROUTE-ONLY VIA DIMENSIONS",
        x: 0,
        y: 5,
        fontSize: 1,
      })}
      {createNote({
        text: "Both inputs specify a 2 mm pad and a 1 mm drill",
        x: 0,
        y: 3.8,
        fontSize: 0.6,
      })}
      {createNote({ text: "EXPECTED: PHYSICAL VIA", x: -7, y: 2.2 })}
      {createNote({ text: "ACTUAL: ROUTE ONLY", x: 7, y: 2.2 })}
      {createNote({ text: "2 mm pad / 1 mm drill", x: -7, y: -2 })}
      {createNote({ text: "Explicit dimensions ignored", x: 7, y: -2 })}
      {createNote({
        text: "The copper rings and pink drills should match",
        x: 0,
        y: -4,
        fontSize: 0.6,
      })}
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
