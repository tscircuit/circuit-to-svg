import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("non-finite silkscreen font_size falls back to default 1 without emitting NaN", () => {
  const baseBoard = {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  }

  const defaultSvg = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text0",
      layer: "top",
      text: "hi",
      anchor_position: { x: 3, y: 3 },
      font_size: 1,
    },
  ] as any)

  for (const invalidSize of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToPcbSvg([
      baseBoard,
      {
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: "text0",
        layer: "top",
        text: "hi",
        anchor_position: { x: 3, y: 3 },
        font_size: invalidSize,
      },
    ] as any)

    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toBe(defaultSvg)
  }
})

test('non-finite circle keepout radius falls back to 0 without emitting r="NaN"', () => {
  const baseBoard = {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
  }

  const zeroRadiusSvg = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout0",
      shape: "circle",
      layers: ["top"],
      center: { x: 5, y: 5 },
      radius: 0,
    },
  ] as any)

  for (const invalidRadius of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToPcbSvg([
      baseBoard,
      {
        type: "pcb_keepout",
        pcb_keepout_id: "keepout0",
        shape: "circle",
        layers: ["top"],
        center: { x: 5, y: 5 },
        radius: invalidRadius,
      },
    ] as any)

    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toContain('r="0"')
    expect(svg).toBe(zeroRadiusSvg)
  }
})

test("valid silkscreen font_size and circle keepout radius render verbatim", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text1",
      layer: "top",
      text: "OK",
      anchor_position: { x: 0, y: 0 },
      font_size: 2,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      layers: ["top"],
      center: { x: 2, y: 2 },
      radius: 3,
    },
  ] as any)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain("pcb-keepout-circle")
  expect(svg).not.toContain('r="0"')
})
