import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const baseBoard = {
  type: "pcb_board" as const,
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 30,
  height: 20,
  material: "fr4" as const,
  num_layers: 2,
  thickness: 1.2,
}

test("non-finite pcb_silkscreen_text font_size falls back to default 1 instead of emitting NaN", () => {
  const withDefault = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "center",
      text: "hi",
    },
  ])

  for (const badFontSize of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToPcbSvg([
      baseBoard,
      {
        type: "pcb_silkscreen_text",
        layer: "top",
        pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
        font: "tscircuit2024",
        font_size: badFontSize,
        pcb_component_id: "pcb_component_0",
        anchor_position: { x: 3, y: 3 },
        anchor_alignment: "center",
        text: "hi",
      },
    ])

    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toBe(withDefault)
  }
})

test("non-finite pcb_silkscreen_text font_size with is_knockout falls back to default 1", () => {
  const withDefault = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_ko",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "KO",
      is_knockout: true,
    },
  ])

  const withNaN = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_ko",
      font: "tscircuit2024",
      font_size: Number.NaN,
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "KO",
      is_knockout: true,
    },
  ])

  const normalizeMaskId = (svg: string) =>
    svg.replace(
      /silkscreen-knockout-mask-pcb_silkscreen_text_ko-\d+/g,
      "silkscreen-knockout-mask-pcb_silkscreen_text_ko-N",
    )

  expect(withNaN).not.toContain("NaN")
  expect(normalizeMaskId(withNaN)).toBe(normalizeMaskId(withDefault))
})

test("non-finite circular pcb_keepout radius falls back to 0 instead of emitting r=NaN", () => {
  const withZeroRadius = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_circle_0",
      center: { x: 5, y: 5 },
      radius: 0,
      layers: ["top"],
    },
  ])

  for (const badRadius of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToPcbSvg([
      baseBoard,
      {
        type: "pcb_keepout",
        shape: "circle",
        pcb_keepout_id: "pcb_keepout_circle_0",
        center: { x: 5, y: 5 },
        radius: badRadius,
        layers: ["top"],
      },
    ])

    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toContain('r="0"')
    expect(svg).toBe(withZeroRadius)
  }
})

test("valid finite silkscreen font_size and circular keepout radius render verbatim", () => {
  const svg = convertCircuitJsonToPcbSvg([
    baseBoard,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_valid",
      font: "tscircuit2024",
      font_size: 0.75,
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "L1\nL2",
    },
    {
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_valid",
      center: { x: 5, y: 5 },
      radius: 4,
      layers: ["top"],
    },
  ])

  expect(svg).toContain('font-size="18.75"')
  expect(svg).toContain('dy="18.75"')
  expect(svg).toContain('r="100"')
})
