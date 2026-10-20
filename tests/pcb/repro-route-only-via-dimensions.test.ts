import { expect, test } from "bun:test"
import { pcb_board, pcb_note_text, pcb_trace, pcb_via } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

function createRouteTrace(x = 0) {
  return pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: `route_${x}`,
    route: [
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
    ],
  })
}

function createPhysicalVia(x = 0) {
  return pcb_via.parse({
    type: "pcb_via",
    pcb_via_id: "physical_via",
    x,
    y: 0,
    layers: ["top", "bottom"],
    outer_diameter: 2,
    hole_diameter: 1,
  })
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
  return pcb_note_text.parse({
    type: "pcb_note_text",
    pcb_note_text_id: text,
    text,
    anchor_position: { x, y },
    anchor_alignment: "center",
    font_size: fontSize,
    layer: "top",
    color: "#f8fafc",
  })
}

const board = pcb_board.parse({
  type: "pcb_board",
  pcb_board_id: "board",
  width: 30,
  height: 14,
  center: { x: 0, y: 0 },
})

function getViaRadii(svg: string) {
  return [
    ...svg.matchAll(
      /<circle[^>]*class="pcb-hole-(outer|inner)"[^>]*\br="([^"]+)"[^>]*data-type="pcb_via"/g,
    ),
  ].map((circle) => ({ part: circle[1], radius: Number(circle[2]) }))
}

function renderRouteOnlyVia() {
  return convertCircuitJsonToPcbSvg([board, createRouteTrace()])
}

function renderPhysicalViaControl() {
  return convertCircuitJsonToPcbSvg([
    board,
    createRouteTrace(),
    createPhysicalVia(),
  ])
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
  const svg = convertCircuitJsonToPcbSvg(
    [
      board,
      createRouteTrace(-7),
      createPhysicalVia(-7),
      createRouteTrace(7),
      createNote({
        text: "ROUTE-ONLY VIA DIMENSIONS",
        x: 0,
        y: 5,
        fontSize: 1,
      }),
      createNote({
        text: "Both inputs specify a 2 mm pad and a 1 mm drill",
        x: 0,
        y: 3.8,
        fontSize: 0.6,
      }),
      createNote({ text: "EXPECTED: PHYSICAL VIA", x: -7, y: 2.2 }),
      createNote({ text: "ACTUAL: ROUTE ONLY", x: 7, y: 2.2 }),
      createNote({ text: "2 mm pad / 1 mm drill", x: -7, y: -2 }),
      createNote({ text: "Explicit dimensions ignored", x: 7, y: -2 }),
      createNote({
        text: "The copper rings and pink drills should match",
        x: 0,
        y: -4,
        fontSize: 0.6,
      }),
    ],
    {
      width: 1200,
      height: 600,
      showPcbNotes: true,
      backgroundColor: "#0f172a",
    },
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
