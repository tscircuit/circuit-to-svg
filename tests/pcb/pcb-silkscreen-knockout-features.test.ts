import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text with knockout and padding", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_001",
      pcb_component_id: "comp_001",
      layer: "top",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "center",
      text: "VIN 3-5V",
      font_size: 2,
      ccw_rotation: 0,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm", 
        top: "0.5mm",
        bottom: "0.5mm"
      }
    },
  ] as any)

  expect(svg).toContain("<mask")
  expect(svg).toContain("mask=\"url(#knockout-mask-")
  expect(svg).toContain("VIN 3-5V")
})

test("pcb silkscreen knockout with rounded corners", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_002",
      pcb_component_id: "comp_002",
      layer: "top",
      anchor_position: { x: 20, y: 10 },
      anchor_alignment: "center",
      text: "ROUNDED",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm"
      },
      knockout_corner_radius: "0.3mm"
    },
  ] as any)

  expect(svg).toContain("rx=\"")
  expect(svg).toContain("ry=\"")
})

test("knockout with border", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_003",
      pcb_component_id: "comp_003",
      layer: "top",
      anchor_position: { x: 30, y: 10 },
      anchor_alignment: "center",
      text: "BORDERED",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm"
      },
      knockout_border_width: "0.2mm"
    },
  ] as any)

  expect(svg).toContain("stroke-width=\"")
  expect(svg).toContain("fill=\"none\"")
})

test("knockout with custom color", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_004",
      pcb_component_id: "comp_004",
      layer: "top",
      anchor_position: { x: 40, y: 10 },
      anchor_alignment: "center",
      text: "GOLDEN",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm"
      },
      knockout_color: "#FFD700"
    },
  ] as any)

  expect(svg).toContain("fill=\"#FFD700\"")
})

test("mixed regular and knockout text", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_005",
      pcb_component_id: "comp_005",
      layer: "top",
      anchor_position: { x: 10, y: 20 },
      anchor_alignment: "center",
      text: "KNOCKOUT",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm"
      }
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_006",
      pcb_component_id: "comp_006",
      layer: "top",
      anchor_position: { x: 30, y: 20 },
      anchor_alignment: "center",
      text: "NORMAL",
      font_size: 2,
      is_knockout: false
    },
  ] as any)

  // Knockout text should have mask
  expect(svg).toContain("KNOCKOUT")
  expect(svg).toContain("<mask")
  
  // Normal text should not have mask but be simple text element
  expect(svg).toContain("NORMAL")
  expect(svg.match(/<text[^>]*>.*NORMAL/)).toBeTruthy()
})

test("knockout text with rotation", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_007",
      pcb_component_id: "comp_007",
      layer: "top",
      anchor_position: { x: 25, y: 25 },
      anchor_alignment: "center",
      text: "ROTATED",
      font_size: 2,
      ccw_rotation: 45,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm"
      }
    },
  ] as any)

  expect(svg).toContain("transform=")
  expect(svg).toContain("ROTATED")
})