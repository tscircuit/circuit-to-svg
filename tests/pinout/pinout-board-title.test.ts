import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("Pinout board title: source_board.title renders at top of SVG", () => {
  const soup: any[] = []

  soup.push({
    type: "source_board",
    source_board_id: "sb_0",
    title: "Arduino Nano",
  })

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  // Add a couple pins so the pinout isn't empty
  for (let i = 0; i < 3; i++) {
    const y = -2 + 2 * i
    soup.push({
      type: "source_port",
      source_port_id: `sp_${i}`,
      name: `D${i}`,
      port_hints: [`D${i}`],
    })
    soup.push({
      type: "pcb_port",
      pcb_port_id: `pp_${i}`,
      source_port_id: `sp_${i}`,
      x: -5,
      y,
      is_board_pinout: true,
    })
    soup.push({
      type: "pcb_smtpad",
      shape: "rect",
      x: -5,
      y,
      width: 0.5,
      height: 0.5,
      layer: "top",
      pcb_port_id: `pp_${i}`,
    })
  }

  const svg = convertCircuitJsonToPinoutSvg(soup)

  // Title text should appear in the SVG
  expect(svg).toContain("Arduino Nano")
  // Title should have the pinout-board-title class
  expect(svg).toContain("pinout-board-title")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("Pinout without title: no title element when source_board has no title", () => {
  const soup: any[] = []

  soup.push({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  })

  soup.push({
    type: "source_port",
    source_port_id: "sp_0",
    name: "D0",
    port_hints: ["D0"],
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

  const svg = convertCircuitJsonToPinoutSvg(soup)

  // Should NOT contain a title element
  expect(svg).not.toContain("pinout-board-title")
})
