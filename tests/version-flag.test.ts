import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToSolderPasteMask,
  CIRCUIT_TO_SVG_VERSION,
} from "lib"

const basicPcb = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
] as any

const basicSch = [
  {
    type: "schematic_box",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    schematic_component_id: "b1",
    is_dashed: true,
  },
] as any

test("version attribute omitted by default", () => {
  const svg = convertCircuitJsonToPcbSvg(basicPcb)
  expect(svg).not.toContain("data-circuit-to-svg-version")
})

test("includeVersion option adds data attribute", () => {
  const pcbSvg = convertCircuitJsonToPcbSvg(basicPcb, { includeVersion: true })
  expect(pcbSvg).toContain(
    `data-circuit-to-svg-version="${CIRCUIT_TO_SVG_VERSION}"`,
  )

  const asmSvg = convertCircuitJsonToAssemblySvg(basicPcb, {
    includeVersion: true,
  })
  expect(asmSvg).toContain(
    `data-circuit-to-svg-version="${CIRCUIT_TO_SVG_VERSION}"`,
  )

  const solderSvg = convertCircuitJsonToSolderPasteMask(basicPcb, {
    layer: "top",
    includeVersion: true,
  })
  expect(solderSvg).toContain(
    `data-circuit-to-svg-version="${CIRCUIT_TO_SVG_VERSION}"`,
  )

  const schSvg = convertCircuitJsonToSchematicSvg(basicSch, {
    includeVersion: true,
  })
  expect(schSvg).toContain(
    `data-circuit-to-svg-version="${CIRCUIT_TO_SVG_VERSION}"`,
  )
})
