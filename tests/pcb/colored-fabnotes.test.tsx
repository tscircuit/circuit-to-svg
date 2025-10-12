import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("fabrication note path and fabrication note text", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="22mm" height="22mm">
      <fabricationnotepath
        color="blue"
        route={[
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          {
            x: 10,
            y: 10,
          },
          {
            x: 0,
            y: 0,
          },
        ]}
      />
      <fabricationnotetext
        color="#0000ff"
        anchorAlignment="bottom_left"
        text="hello world!"
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson() as any[]

  circuitJson.push({
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_colored",
    pcb_component_id: "pcb_generic_component_0",
    center: { x: 5, y: 5 },
    width: 6,
    height: 4,
    stroke_width: 0.2,
    layer: "top",
    is_filled: true,
    color: "#0000ff",
  })

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
