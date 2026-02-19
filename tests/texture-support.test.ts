
import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import { anySvg } from "bun-match-svg"

test("pcb silkscreen rect with texture", () => {
  const circuitJson = [
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "rect1",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
      is_filled: true,
      pcbStyle: {
        texture: {
          type: "url",
          url: "https://example.com/texture.png",
          scale: 2,
          rotation: 45,
        },
      },
    },
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
  ];

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 200,
    height: 200,
  });

  // Check for pattern definition
  expect(svg).toContain(
    '<pattern id="texture-pcb_silkscreen_rect-rect1-pattern"'
  );
  expect(svg).toContain('href="https://example.com/texture.png"');
  expect(svg).toContain('transform="rotate(45)"');

  // Check that the rect uses the pattern
  expect(svg).toContain('fill="url(#texture-pcb_silkscreen_rect-rect1-pattern)"');

  // Use snapshot for visual regression
  expect(svg).toMatchSnapshot();
});
