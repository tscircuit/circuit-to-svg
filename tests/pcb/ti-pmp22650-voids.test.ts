import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_altium",
    center: { x: 161.22649746, y: 105.42269619 },
    width: 287.29940508,
    height: 132.91819746,
    shape: "polygon",
    outline: [
      { x: 17.5768, y: 38.9636 },
      { x: 304.8762, y: 38.96359746 },
      { x: 304.8762, y: 171.88179492 },
      { x: 17.57679492, y: 171.88179492 },
    ],
    thickness: 1.6,
    num_layers: 8,
    material: "fr4",
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pmp22650_top_copper",
    shape: "rect",
    layer: "top",
    center: { x: 161.22649746, y: 105.42269619 },
    width: 287.29940508,
    height: 132.91819746,
    covered_with_solder_mask: false,
  } satisfies PcbCopperPour,
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_altium_23",
    pcb_board_id: "pcb_board_altium",
    shape: "polygon",
    points: [
      { x: 83.58639874, y: 87.73279888 },
      { x: 108.58639954, y: 87.73279888 },
      { x: 108.58639954, y: 117.73279984 },
      { x: 83.58639874, y: 117.73279984 },
    ],
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pmp22650_mounting_hole",
    hole_shape: "circle",
    hole_diameter: 6,
    x: 140,
    y: 105,
  },
]

test("renders TI PMP22650 cutouts and mounting holes as physical voids", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    backgroundColor: "transparent",
    matchBoardAspectRatio: true,
  })

  expect(svg).toContain('<mask id="pcb-void-mask"')
  expect(svg).toContain('mask="url(#pcb-void-mask)"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("can explicitly display the PCB drill layer", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showDrillLayer: true,
  })

  expect(svg).not.toContain('mask="url(#pcb-void-mask)"')
  expect(svg).toContain('fill="#FF26E2"')
})
