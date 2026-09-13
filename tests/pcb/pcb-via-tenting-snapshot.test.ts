import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("PCB snapshots show via tenting on each face and preserve copper-only views", () => {
  const modes = [
    { label: "Exposed", top: false, bottom: false },
    { label: "Top tented", top: true, bottom: false },
    { label: "Bottom tented", top: false, bottom: true },
    { label: "Both tented", top: true, bottom: true },
  ]
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 60,
      height: 16,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
  ]
  for (const [index, { label, top, bottom }] of modes.entries()) {
    const x = -24 + index * 12
    elements.push(
      {
        type: "pcb_via",
        pcb_via_id: `via_${index}`,
        x,
        y: 0,
        outer_diameter: 2.4,
        hole_diameter: 1.2,
        layers: ["top", "bottom"],
        tented_on_top: top,
        tented_on_bottom: bottom,
      },
      {
        type: "pcb_note_text",
        pcb_note_text_id: `label_${index}`,
        text: label,
        anchor_position: { x, y: 2.8 },
        anchor_alignment: "center",
        layer: "top",
        font: "tscircuit2024",
        font_size: 0.8,
        color: "#ffffff",
      },
    )
    for (const layer of ["top", "bottom"] as const) {
      elements.push({
        type: "pcb_trace",
        pcb_trace_id: `trace_${index}_${layer}`,
        route: [
          { route_type: "wire", x: x - 3, y: -2, width: 0.4, layer },
          { route_type: "wire", x, y: 0, width: 0.4, layer },
          { route_type: "via", x, y: 0, from_layer: "top", to_layer: "bottom" },
        ],
      })
    }
  }
  elements.push(
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "connector",
      shape: "circle",
      x: 24,
      y: 0,
      outer_diameter: 3.6,
      hole_diameter: 1.8,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_note_text",
      pcb_note_text_id: "connector_label",
      text: "Connector",
      anchor_position: { x: 24, y: 2.8 },
      anchor_alignment: "center",
      layer: "top",
      font: "tscircuit2024",
      font_size: 0.8,
      color: "#ffffff",
    },
  )

  for (const layer of ["top", "bottom"] as const) {
    for (const showSolderMask of [true, false]) {
      const view = `${layer}-${showSolderMask ? "soldermask" : "copper"}`
      const circuit: AnyCircuitElement[] = [
        ...elements,
        {
          type: "pcb_note_text",
          pcb_note_text_id: "view_label",
          text: `${layer.toUpperCase()} VIEW - ${showSolderMask ? "Soldermask enabled" : "Copper only"}`,
          anchor_position: { x: 0, y: 6 },
          anchor_alignment: "center",
          layer: "top",
          font: "tscircuit2024",
          font_size: 1,
          color: "#ffffff",
        },
      ]
      const options = { layer, showSolderMask, width: 1200, height: 320 }
      const svg = convertCircuitJsonToPcbSvg(circuit, options)
      if (!showSolderMask) {
        const withoutTenting = circuit.map((element) =>
          element.type === "pcb_via"
            ? {
                ...element,
                tented_on_top: undefined,
                tented_on_bottom: undefined,
              }
            : element,
        )
        expect(svg).toBe(convertCircuitJsonToPcbSvg(withoutTenting, options))
      }
      expect(svg).toMatchSvgSnapshot(
        import.meta.path,
        `pcb-via-tenting-${view}`,
      )
    }
  }
})
