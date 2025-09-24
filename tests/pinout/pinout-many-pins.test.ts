import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout with many pins", () => {
  const soup: any[] = []
  const pin_count = 20

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  for (let i = 0; i < pin_count; i++) {
    const source_port_id = `source_port_${i}`
    const pcb_port_id = `pcb_port_${i}`
    const y = -4.5 + (9 / (pin_count - 1)) * i

    soup.push({
      type: "source_port",
      source_port_id,
      name: `P${i}`,
    })
    soup.push({
      type: "pcb_port",
      pcb_port_id,
      source_port_id,
      x: -5,
      y: y,
      is_board_pinout: true,
    })
    soup.push({
      type: "pcb_smtpad",
      shape: "rect",
      x: -5,
      y: y,
      width: 0.5,
      height: 0.5,
      layer: "top",
      pcb_port_id,
    })
  }

  // Add some on the right side too
  for (let i = 0; i < 5; i++) {
    const source_port_id = `source_port_r_${i}`
    const pcb_port_id = `pcb_port_r_${i}`
    const y = -2 + 1 * i

    soup.push({
      type: "source_port",
      source_port_id,
      name: `R${i}`,
    })
    soup.push({
      type: "pcb_port",
      pcb_port_id,
      source_port_id,
      x: 5,
      y: y,
      is_board_pinout: true,
    })
    soup.push({
      type: "pcb_plated_hole",
      shape: "circle",
      x: 5,
      y: y,
      hole_diameter: 0.6,
      outer_diameter: 1,
      pcb_port_id,
    })
  }

  expect(convertCircuitJsonToPinoutSvg(soup)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
