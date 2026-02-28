import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout multi-label: ports with multiple port_hints render aliases", () => {
  const soup: any[] = []

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  // Pin with multiple aliases (e.g. GPIO0 / SDA / pin1)
  soup.push({
    type: "source_port",
    source_port_id: "sp_0",
    name: "GPIO0",
    port_hints: ["GPIO0", "SDA", "I2C_DATA"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_0",
    source_port_id: "sp_0",
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
    pcb_port_id: "pp_0",
  })

  // Pin with two aliases
  soup.push({
    type: "source_port",
    source_port_id: "sp_1",
    name: "GPIO1",
    port_hints: ["GPIO1", "SCL"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_1",
    source_port_id: "sp_1",
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
    pcb_port_id: "pp_1",
  })

  // Pin with single label (no aliases)
  soup.push({
    type: "source_port",
    source_port_id: "sp_2",
    name: "VCC",
    port_hints: ["VCC"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_2",
    source_port_id: "sp_2",
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
    pcb_port_id: "pp_2",
  })

  const svg = convertCircuitJsonToPinoutSvg(soup)

  // Verify aliases appear in the SVG output
  expect(svg).toContain("SDA")
  expect(svg).toContain("I2C_DATA")
  expect(svg).toContain("GPIO0")
  expect(svg).toContain("SCL")
  expect(svg).toContain("GPIO1")
  expect(svg).toContain("VCC")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
