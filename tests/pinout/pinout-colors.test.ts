import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout colors: ports with pinout_color get colored label backgrounds", () => {
  const soup: any[] = []

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  // Red power pin
  soup.push({
    type: "source_port",
    source_port_id: "sp_vcc",
    name: "VCC",
    port_hints: ["VCC"],
    pinout_color: "red",
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_vcc",
    source_port_id: "sp_vcc",
    x: -5,
    y: -2,
    is_board_pinout: true,
  })
  soup.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -5,
    y: -2,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_vcc",
  })

  // Blue data pin
  soup.push({
    type: "source_port",
    source_port_id: "sp_sda",
    name: "SDA",
    port_hints: ["SDA"],
    pinout_color: "#0000ff",
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_sda",
    source_port_id: "sp_sda",
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
    pcb_port_id: "pp_sda",
  })

  // Default color pin (no pinout_color)
  soup.push({
    type: "source_port",
    source_port_id: "sp_gnd",
    name: "GND",
    port_hints: ["GND"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_gnd",
    source_port_id: "sp_gnd",
    x: -5,
    y: 2,
    is_board_pinout: true,
  })
  soup.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -5,
    y: 2,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_gnd",
  })

  const svg = convertCircuitJsonToPinoutSvg(soup)

  // Verify custom colors appear in the SVG
  expect(svg).toContain("red")
  expect(svg).toContain("#0000ff")
  // Default pins use black background
  expect(svg).toContain("rgb(0, 0, 0)")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
