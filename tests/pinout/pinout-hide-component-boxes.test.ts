import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout hide component boxes: gray boxes hidden by default", () => {
  const soup: any[] = []

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  // Add a pcb_component (would normally render a gray box)
  soup.push({
    type: "pcb_component",
    pcb_component_id: "pc_0",
    source_component_id: "sc_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 3,
    rotation: 0,
    layer: "top",
  })
  soup.push({
    type: "source_component",
    source_component_id: "sc_0",
    name: "U1",
    ftype: "simple_chip",
  })

  // Add a pin
  soup.push({
    type: "source_port",
    source_port_id: "sp_0",
    name: "VCC",
    port_hints: ["VCC"],
  })
  soup.push({
    type: "pcb_port",
    pcb_port_id: "pp_0",
    source_port_id: "sp_0",
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
    pcb_port_id: "pp_0",
  })

  // Default: component boxes should be hidden
  const svgDefault = convertCircuitJsonToPinoutSvg(soup)
  expect(svgDefault).not.toContain("pinout-component-box")

  // With showComponentBoxes: true, they should appear
  const svgWithBoxes = convertCircuitJsonToPinoutSvg(soup, {
    showComponentBoxes: true,
  })
  expect(svgWithBoxes).toContain("pinout-component-box")

  expect(svgDefault).toMatchSvgSnapshot(import.meta.path)
})
