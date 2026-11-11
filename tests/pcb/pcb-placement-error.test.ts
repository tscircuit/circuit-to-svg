import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import panel from "../assets/panel-support-errors.json"

// Emitted by checkPcbBoardSupport against the original basic-usbc-devices panel.
// Retain geometry and diagnostics only; no renderer-side inference of support.
const circuit = panel as AnyCircuitElement[]

test("highlights all four poorly supported board regions", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    shouldDrawErrors: true,
    showSolderMask: true,
    backgroundColor: "white",
    colorOverrides: { drill: "white" },
    width: 900,
    height: 1050,
  })
  expect(svg.match(/data-error-region="true"/g)).toHaveLength(4)
  expect(svg).toContain("Support error")
  expect(svg).toContain("2 surviving tabs")
  expect(svg).toContain("all surviving mouse-bite tabs attach along one side")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("placement highlights respect shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    shouldDrawErrors: false,
    showSolderMask: true,
    backgroundColor: "white",
    colorOverrides: { drill: "white" },
    width: 900,
    height: 1050,
  })
  expect(svg).not.toContain("data-error-region")
  expect(svg).not.toContain("Support error")
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-placement-error-hidden")
})

test("location-only diagnostics get a marker; unlocated errors do not invent one", () => {
  const board = circuit.find((e) => e.type === "pcb_board")!
  const errors = [
    {
      type: "pcb_placement_error",
      error_type: "pcb_placement_error",
      pcb_placement_error_id: "located",
      center: { x: 0, y: 0 },
      message: "Placement <problem> & explanation",
    },
    {
      type: "pcb_placement_error",
      error_type: "pcb_placement_error",
      pcb_placement_error_id: "unlocated",
      message: "No location",
    },
    {
      type: "pcb_placement_error",
      error_type: "pcb_placement_error",
      pcb_placement_error_id: "invalid",
      center: { x: NaN, y: 0 },
      message: "Invalid location",
    },
  ] as AnyCircuitElement[]
  const svg = convertCircuitJsonToPcbSvg([board, ...errors], {
    shouldDrawErrors: true,
  })
  expect(svg).toContain('data-pcb-placement-error-id="located"')
  expect(svg).not.toContain('data-pcb-placement-error-id="unlocated"')
  expect(svg).not.toContain('data-pcb-placement-error-id="invalid"')
  expect(svg).not.toContain("NaN")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-placement-error-location-only",
  )
})
