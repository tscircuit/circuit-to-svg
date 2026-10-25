import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib/index"

test("assembly pin-1 triangle selects pin 1 regardless of port array order and handles 90deg rotation", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
    },
    {
      type: "source_component",
      source_component_id: "sc_1",
      name: "U1",
      are_pins_interchangeable: false,
    },
    {
      type: "source_port",
      source_port_id: "sp_1",
      source_component_id: "sc_1",
      pin_number: 1,
      name: "pin1",
    },
    {
      type: "source_port",
      source_port_id: "sp_2",
      source_component_id: "sc_1",
      pin_number: 2,
      name: "pin2",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_comp_1",
      source_component_id: "sc_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      rotation: 90,
      layer: "top",
    },
    // Port 2 is listed first in soup to verify port-order independence
    {
      type: "pcb_port",
      pcb_port_id: "port_2",
      pcb_component_id: "pcb_comp_1",
      source_port_id: "sp_2",
      x: 3,
      y: 3,
    },
    // Port 1 (pin 1) is listed second in soup
    // At rotation 90, pin 1 local (-3, -3) rotates CCW by 90 to (3, -3)
    {
      type: "pcb_port",
      pcb_port_id: "port_1",
      pcb_component_id: "pcb_comp_1",
      source_port_id: "sp_1",
      x: 3,
      y: -3,
    },
  ]

  const svg = convertCircuitJsonToAssemblySvg(soup)

  // Verify pin 1 indicator exists
  expect(svg).toContain("assembly-pin1-indicator")

  // The indicator points must be in unrotated component space (top-left [-w, -h])
  // Rather than wrongly using port 2's bottom-right corner or double-rotating
  const pin1Match = svg.match(
    /<polygon class="assembly-pin1-indicator" points="([^"]+)" fill="#333" stroke="none" transform="rotate\(-90\)"\/>/,
  )
  expect(pin1Match).not.toBeNull()

  if (pin1Match) {
    const pointsStr = pin1Match[1]
    // Width = 10, scaledWidth / 2 = w. In local frame, pin 1 is at negative local coords (-w, -h)
    const firstPoint = pointsStr.split(" ")[0]
    const [xVal, yVal] = firstPoint.split(",").map(Number)
    expect(xVal).toBeLessThan(0)
    expect(yVal).toBeLessThan(0)
  }
})

test("assembly pin-1 triangle preserves correct corner across 0, 90, 180, and 270 rotations", () => {
  for (const rot of [0, 90, 180, 270]) {
    const rad = (rot * Math.PI) / 180
    // Local pin 1 is at (-3, -3)
    const localX = -3
    const localY = -3
    const worldX = localX * Math.cos(rad) - localY * Math.sin(rad)
    const worldY = localX * Math.sin(rad) + localY * Math.cos(rad)

    const soup: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        center: { x: 0, y: 0 },
        width: 30,
        height: 30,
      },
      {
        type: "source_component",
        source_component_id: "sc_1",
        name: "U1",
        are_pins_interchangeable: false,
      },
      {
        type: "source_port",
        source_port_id: "sp_1",
        source_component_id: "sc_1",
        pin_number: 1,
        name: "1",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_comp_1",
        source_component_id: "sc_1",
        center: { x: 0, y: 0 },
        width: 8,
        height: 8,
        rotation: rot,
        layer: "top",
      },
      {
        type: "pcb_port",
        pcb_port_id: "port_1",
        pcb_component_id: "pcb_comp_1",
        source_port_id: "sp_1",
        x: worldX,
        y: worldY,
      },
    ]

    const svg = convertCircuitJsonToAssemblySvg(soup)
    const pin1Match = svg.match(
      new RegExp(
        `<polygon class="assembly-pin1-indicator" points="([^"]+)" fill="#333" stroke="none" transform="rotate\\(-?${rot}\\)"\\/>`,
      ),
    )
    expect(pin1Match).not.toBeNull()

    if (pin1Match) {
      const pointsStr = pin1Match[1]
      const firstPoint = pointsStr.split(" ")[0]
      const [xVal, yVal] = firstPoint.split(",").map(Number)
      // Regardless of rotation, unrotated local corner point must remain (-w, -h)
      expect(xVal).toBeLessThan(0)
      expect(yVal).toBeLessThan(0)
    }
  }
})
