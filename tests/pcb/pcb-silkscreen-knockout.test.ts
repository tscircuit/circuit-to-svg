// @ts-nocheck
import { test, expect } from "bun:test";
import { writeFileSync } from "fs";
import { convertCircuitJsonToPcbSvg } from "lib";

test("pcb silkscreen text (no knockout)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_0",
      layer: "top",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "center",
      text: "HV-IN",
      font_size: 2.4,
      ccw_rotation: 0,
      knockout: false,
      knockout_padding: 0.25,
    },
  ] as any);

  // snapshot z bun/test
  expect(svg).toMatchSnapshot();
});

test("pcb silkscreen text (knockout + padding)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_1",
      layer: "top",
      anchor_position: { x: 20, y: 12 },
      anchor_alignment: "center",
      text: "HELLO",
      font_size: 2.4,
      ccw_rotation: 0,
      knockout: true,
      knockout_padding: 0.5,
    },
  ] as any);

  // ustvarimo datoteko za PR screenshot
  writeFileSync("knockout-demo.svg", svg);

  // vsaj preveri, da je maska v SVG-ju
  expect(svg).toContain("<mask");
  expect(svg).toMatchSnapshot();
});

test("pcb silkscreen text (knockout rotated 15°)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_2",
      layer: "top",
      anchor_position: { x: 30, y: 15 },
      anchor_alignment: "center",
      text: "VIN",
      font_size: 2.0,
      ccw_rotation: 15,
      knockout: true,
      knockout_padding: 0.3,
    },
  ] as any);

  expect(svg).toContain("<mask");
  expect(svg).toMatchSnapshot();
});
