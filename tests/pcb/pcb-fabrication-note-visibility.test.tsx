import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToPcbSvg } from "lib"

// Repro: https://github.com/tscircuit/circuit-json-to-gltf/issues/199
// These snapshots intentionally capture the current bugs:
// - showPcbNotes:false still draws fabrication annotations on the top face.
// - The top-only fabrication path also appears on the bottom face.
// Update the snapshots when these bugs are fixed.
const FabricationNoteVisibilityRepro = ({
  layer,
}: {
  layer: "top" | "bottom"
}) => (
  <board width={20} height={20}>
    <fabricationnotepath
      layer="top"
      route={[
        { x: 1, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
      ]}
      strokeWidth={0.2}
    />
    <fabricationnotetext
      layer="top"
      text="Fabrication only"
      pcbX={-4}
      pcbY={4}
      anchorAlignment="center"
      fontSize={1}
    />
    <fabricationnoterect
      layer="top"
      pcbX={-3}
      pcbY={-3}
      width={2}
      height={2}
      strokeWidth={0.2}
      hasStroke
      isFilled={false}
    />
    <fabricationnotedimension
      layer="top"
      from={{ x: 1, y: -4 }}
      to={{ x: 4, y: -4 }}
      text="3 mm"
      fontSize={1}
      arrowSize={0.5}
    />
    <pcbnotetext
      layer={layer}
      text="User note"
      pcbX={0}
      pcbY={-1}
      anchorAlignment="center"
      fontSize={1}
    />
    <silkscreentext
      layer={layer}
      text={layer === "top" ? "TOP SILK" : "BOTTOM SILK"}
      pcbX={0}
      pcbY={7}
      anchorAlignment="center"
      fontSize={1}
    />
    <smtpad
      layer={layer}
      shape="rect"
      pcbX={5}
      pcbY={-7}
      width={2}
      height={1}
    />
  </board>
)

test("repro: top fabrication notes remain visible while user notes are hidden with showPcbNotes=false", async () => {
  const circuit = new Circuit()
  circuit.add(<FabricationNoteVisibilityRepro layer="top" />)

  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    layer: "top",
    showPcbNotes: false,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // User notes are hidden, but all four fabrication annotations still render.
  expect(svg).not.toContain('data-type="pcb_note_text"')
  expect(svg).toContain('data-type="pcb_fabrication_note_path"')
  expect(svg).toContain('data-type="pcb_fabrication_note_text"')
  expect(svg).toContain('data-type="pcb_fabrication_note_rect"')
  expect(svg).toContain('data-type="pcb_fabrication_note_dimension"')
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-top-show-pcb-notes-false",
  )
})

test("top layer shows fabrication notes and user notes with showPcbNotes=true", async () => {
  const circuit = new Circuit()
  circuit.add(<FabricationNoteVisibilityRepro layer="top" />)

  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    layer: "top",
    showPcbNotes: true,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Control: enabling PCB notes shows the user note alongside fabrication notes.
  expect(svg).toContain('data-type="pcb_note_text"')
  expect(svg).toContain('data-type="pcb_fabrication_note_path"')
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-top-show-pcb-notes-true",
  )
})

test("repro: bottom layer shows a top-only fabrication path while user notes are hidden with showPcbNotes=false", async () => {
  const circuit = new Circuit()
  circuit.add(<FabricationNoteVisibilityRepro layer="bottom" />)

  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    layer: "bottom",
    showPcbNotes: false,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // The top-only fabrication path incorrectly appears on the bottom face.
  expect(svg).not.toContain('data-type="pcb_note_text"')
  expect(svg).toContain('data-type="pcb_fabrication_note_path"')
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-bottom-show-pcb-notes-false",
  )
})

test("repro: bottom layer shows a top-only fabrication path and user notes with showPcbNotes=true", async () => {
  const circuit = new Circuit()
  circuit.add(<FabricationNoteVisibilityRepro layer="bottom" />)

  const svg = convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
    layer: "bottom",
    showPcbNotes: true,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Enabling user notes still leaves the top-only path on the bottom face.
  expect(svg).toContain('data-type="pcb_note_text"')
  expect(svg).toContain('data-type="pcb_fabrication_note_path"')
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-bottom-show-pcb-notes-true",
  )
})
