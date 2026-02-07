import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout with highlight_color", () => {
  const circuitJson: any[] = []

  circuitJson.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  // Pin with highlight color (red)
  circuitJson.push({
    type: "source_port",
    source_port_id: "source_port_0",
    name: "VCC",
    port_hints: ["VCC", "pin1"],
  })
  circuitJson.push({
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    x: -5,
    y: 0,
    is_board_pinout: true,
    highlight_color: "#ff0000",
  })
  circuitJson.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -5,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pcb_port_0",
  })

  // Pin with highlight color (green)
  circuitJson.push({
    type: "source_port",
    source_port_id: "source_port_1",
    name: "GND",
    port_hints: ["GND", "pin2"],
  })
  circuitJson.push({
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: -5,
    y: -2,
    is_board_pinout: true,
    highlight_color: "#00ff00",
  })
  circuitJson.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: -5,
    y: -2,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pcb_port_1",
  })

  // Pin without highlight color (default black)
  circuitJson.push({
    type: "source_port",
    source_port_id: "source_port_2",
    name: "SDA",
    port_hints: ["SDA", "pin3"],
  })
  circuitJson.push({
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    x: 5,
    y: 0,
    is_board_pinout: true,
  })
  circuitJson.push({
    type: "pcb_smtpad",
    shape: "rect",
    x: 5,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pcb_port_2",
  })

  const svg = convertCircuitJsonToPinoutSvg(circuitJson)

  // Verify highlight colors are applied
  expect(svg).toContain('fill="#ff0000"')
  expect(svg).toContain('fill="#00ff00"')
  // Verify default black is still used for non-highlighted pins
  expect(svg).toContain('fill="rgb(0, 0, 0)"')

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
