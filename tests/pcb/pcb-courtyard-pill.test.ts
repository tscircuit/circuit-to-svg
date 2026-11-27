import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders pcb_courtyard_pill when showCourtyards is true and hides it by default", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_courtyard_pill",
      pcb_courtyard_pill_id: "courtyard_pill_top",
      pcb_component_id: "comp_1",
      center: { x: -3, y: 0 },
      width: 6,
      height: 2,
      radius: 1,
      layer: "top",
    },
    {
      type: "pcb_courtyard_pill",
      pcb_courtyard_pill_id: "courtyard_pill_bottom",
      pcb_component_id: "comp_2",
      center: { x: 4, y: 0 },
      width: 4,
      height: 2,
      radius: 0.5,
      layer: "bottom",
    },
  ]

  const hiddenSvg = convertCircuitJsonToPcbSvg(soup)
  expect(hiddenSvg).not.toContain('data-type="pcb_courtyard_pill"')

  const shownSvg = convertCircuitJsonToPcbSvg(soup, { showCourtyards: true })
  expect(shownSvg).toContain('data-type="pcb_courtyard_pill"')
  expect(shownSvg).toContain('data-pcb-courtyard-pill-id="courtyard_pill_top"')
  expect(shownSvg).toContain(
    'data-pcb-courtyard-pill-id="courtyard_pill_bottom"',
  )
  expect(shownSvg).toContain('class="pcb-courtyard-pill pcb-courtyard-top"')
  expect(shownSvg).toContain('class="pcb-courtyard-pill pcb-courtyard-bottom"')

  const topOnlySvg = convertCircuitJsonToPcbSvg(soup, {
    showCourtyards: true,
    layer: "top",
  })
  expect(topOnlySvg).toContain(
    'data-pcb-courtyard-pill-id="courtyard_pill_top"',
  )
  expect(topOnlySvg).not.toContain(
    'data-pcb-courtyard-pill-id="courtyard_pill_bottom"',
  )
})
