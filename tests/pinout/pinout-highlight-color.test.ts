import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"
import type { AnyCircuitElement, PcbPort } from "circuit-json"

test("Pinout with highlightColor", () => {
  const circuitJson: AnyCircuitElement[] = []

  circuitJson.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  })

  // Add ports with different highlight colors
  const ports = [
    { name: "VCC", y: 2, highlight_color: "#ff0000" },
    { name: "GND", y: 0, highlight_color: "#00ff00" },
    { name: "SDA", y: -2, highlight_color: undefined },
  ]

  for (let i = 0; i < ports.length; i++) {
    const { name, y, highlight_color } = ports[i]!
    const source_port_id = `source_port_${i}`
    const pcb_port_id = `pcb_port_${i}`

    circuitJson.push({
      type: "source_port",
      source_port_id,
      name,
    } as AnyCircuitElement)

    // Create pcb_port with optional highlight_color
    const pcb_port: PcbPort & {
      is_board_pinout: boolean
      highlight_color?: string
    } = {
      type: "pcb_port",
      pcb_port_id,
      source_port_id,
      x: -5,
      y,
      layers: ["top"],
      is_board_pinout: true,
    }
    if (highlight_color) {
      pcb_port.highlight_color = highlight_color
    }
    circuitJson.push(pcb_port as AnyCircuitElement)

    circuitJson.push({
      type: "pcb_smtpad",
      pcb_smtpad_id: `pcb_smtpad_${i}`,
      shape: "rect",
      x: -5,
      y,
      width: 0.5,
      height: 0.5,
      layer: "top",
      pcb_port_id,
    } as AnyCircuitElement)
  }

  expect(convertCircuitJsonToPinoutSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
