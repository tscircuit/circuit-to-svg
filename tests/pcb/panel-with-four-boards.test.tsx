import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("panel with four boards and anchor offsets", async () => {
  const circuit = new Circuit()

  circuit.add(
    <panel layoutMode="grid" pcbX={0} pcbY={0} panelizationMethod="tab-routing">
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
    </panel>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()

  for (const elm of circuitJson) {
    if (elm.type === "pcb_board") {
      elm.position_mode = "relative_to_panel_anchor"
      elm.display_offset_x = `${elm.center.x}mm`
      elm.display_offset_y = `${elm.center.y}mm`
    }
  }

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    showAnchorOffsets: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
