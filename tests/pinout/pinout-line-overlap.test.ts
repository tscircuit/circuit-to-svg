import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout line overlap: internal pins get distance-based offset to prevent overlapping lines", () => {
  const soup: any[] = []

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
  })

  // Edge pin (x = -10, right on the left edge)
  soup.push({
    type: "source_port",
    source_port_id: "sp_edge",
    name: "EDGE_PIN",
    port_hints: ["EDGE_PIN"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_edge",
    source_port_id: "sp_edge",
    x: -10,
    y: -2,
    is_board_pinout: true,
  })
  soup.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -10,
    y: -2,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_edge",
  })

  // Internal pin (x = -5, 5mm from board edge at x=-10)
  soup.push({
    type: "source_port",
    source_port_id: "sp_inner",
    name: "INNER_PIN",
    port_hints: ["INNER_PIN"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_inner",
    source_port_id: "sp_inner",
    x: -5,
    y: 0,
    is_board_pinout: true,
  })
  soup.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -5,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_inner",
  })

  // Deep internal pin (x = -2, 8mm from edge)
  soup.push({
    type: "source_port",
    source_port_id: "sp_deep",
    name: "DEEP_PIN",
    port_hints: ["DEEP_PIN"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_deep",
    source_port_id: "sp_deep",
    x: -2,
    y: 2,
    is_board_pinout: true,
  })
  soup.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -2,
    y: 2,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_deep",
  })

  const svg = convertCircuitJsonToPinoutSvg(soup)

  // All three pins should render
  expect(svg).toContain("EDGE_PIN")
  expect(svg).toContain("INNER_PIN")
  expect(svg).toContain("DEEP_PIN")

  // Polyline elbow paths should exist for each pin
  expect(svg).toContain("polyline")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
