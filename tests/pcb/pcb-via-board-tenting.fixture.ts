import type {
  AnyCircuitElement,
  PcbBoard,
  PcbNoteText,
  PcbTrace,
  PcbVia,
  PcbViaInput,
} from "circuit-json"

const note = (
  text: string,
  x: number,
  y: number,
  fontSize = 1.7,
): PcbNoteText => ({
  type: "pcb_note_text",
  pcb_note_text_id: `${x}_${y}`,
  text,
  anchor_position: { x, y },
  anchor_alignment: "center",
  font: "tscircuit2024",
  font_size: fontSize,
  layer: "top",
  color: "white",
})

export function getViaTentingPanel(
  layer: "top" | "bottom",
): AnyCircuitElement[] {
  return [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel",
      thickness: 1.6,
      covered_with_solder_mask: false,
      center: { x: 0, y: 0 },
      width: 228,
      height: 86,
    },
    note(`${layer.toUpperCase()} VIEW - soldermask ON`, 0, 39, 3),
    note(
      "Via tenting: unset inherits this board; true = tented, false = exposed",
      0,
      35,
    ),
    ...createBoard("A", -57, true, false, layer),
    ...createBoard("B", 57, false, true, layer),
  ]
}

function createBoard(
  name: string,
  x: number,
  top: boolean,
  bottom: boolean,
  layer: "top" | "bottom",
): AnyCircuitElement[] {
  const subcircuitId = `board_${name}`
  const childId = `child_${name}`
  const inheritedState = (layer === "top" ? top : bottom) ? "TENTED" : "EXPOSED"
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: subcircuitId,
    subcircuit_id: subcircuitId,
    pcb_panel_id: "panel",
    center: { x, y: -1 },
    width: 108,
    height: 66,
    material: "fr4",
    thickness: 1.6,
    num_layers: 2,
    min_via_hole_diameter: 2.5,
    min_via_pad_diameter: 5,
    default_via_tented_on_top: top,
    default_via_tented_on_bottom: bottom,
  }
  const inherited: PcbVia = {
    type: "pcb_via",
    pcb_via_id: `${name}_inherited`,
    subcircuit_id: childId,
    x: x - 39,
    y: 5,
    layers: ["top", "bottom"],
    outer_diameter: 5,
    hole_diameter: 2.5,
  }
  const exposed: PcbVia = {
    ...inherited,
    pcb_via_id: `${name}_exposed`,
    x: x - 13,
    subcircuit_id: undefined,
    pcb_group_id: `group_${name}`,
    tented_on_top: false,
    tented_on_bottom: false,
  }
  const tented: PcbVia = {
    ...inherited,
    pcb_via_id: `${name}_tented`,
    x: x + 13,
    subcircuit_id: subcircuitId,
    tented_on_top: true,
    tented_on_bottom: true,
  }
  const legacy: PcbVia & Pick<PcbViaInput, "is_tented"> = {
    ...inherited,
    pcb_via_id: `${name}_legacy`,
    x: x + 39,
    is_tented: false,
  }
  const duplicate: PcbVia & Pick<PcbViaInput, "is_tented"> = {
    ...legacy,
    pcb_via_id: `${name}_duplicate`,
    y: -19,
    subcircuit_id: undefined,
    pcb_trace_id: `trace_${name}`,
  }
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: `trace_${name}`,
    pcb_group_id: `group_${name}`,
    route: [
      { route_type: "wire", x: x - 44, y: -19, width: 0.7, layer: "top" },
      { route_type: "wire", x: x - 39, y: -19, width: 0.7, layer: "top" },
      {
        route_type: "via",
        x: x - 39,
        y: -19,
        from_layer: "top",
        to_layer: "bottom",
      },
      { route_type: "wire", x: x - 39, y: -19, width: 0.7, layer: "bottom" },
      { route_type: "wire", x: x - 13, y: -19, width: 0.7, layer: "bottom" },
      {
        route_type: "via",
        x: x - 13,
        y: -19,
        from_layer: "bottom",
        to_layer: "top",
        tented_on_top: false,
        tented_on_bottom: false,
      },
      { route_type: "wire", x: x - 13, y: -19, width: 0.7, layer: "top" },
      { route_type: "wire", x: x + 13, y: -19, width: 0.7, layer: "top" },
      {
        route_type: "via",
        x: x + 13,
        y: -19,
        from_layer: "top",
        to_layer: "bottom",
        tented_on_top: true,
        tented_on_bottom: true,
      },
      { route_type: "wire", x: x + 13, y: -19, width: 0.7, layer: "bottom" },
      { route_type: "wire", x: x + 39, y: -19, width: 0.7, layer: "bottom" },
      {
        route_type: "via",
        x: x + 39,
        y: -19,
        from_layer: "bottom",
        to_layer: "top",
        tented_on_top: true,
        tented_on_bottom: true,
      },
    ],
  }

  return [
    board,
    {
      type: "pcb_note_rect",
      pcb_note_rect_id: `outline_${name}`,
      center: board.center,
      width: board.width!,
      height: board.height!,
      layer: "top",
      stroke_width: 0.2,
      has_stroke: true,
      is_filled: false,
      color: "#557361",
    },
    {
      type: "source_group",
      source_group_id: `source_${childId}`,
      subcircuit_id: childId,
      parent_subcircuit_id: subcircuitId,
      is_subcircuit: true,
    },
    {
      type: "pcb_group",
      pcb_group_id: `group_${name}`,
      source_group_id: `source_${childId}`,
      subcircuit_id: childId,
      center: { x, y: -1 },
      pcb_component_ids: [],
      anchor_alignment: "center",
    },
    note(`BOARD ${name}`, x, 27, 3),
    note(`Board defaults: top: ${top}, bottom: ${bottom}`, x, 22),
    note("Standalone pcb_via", x, 17, 2.4),
    note("top: unset", x - 39, 12),
    note("bottom: unset", x - 39, 9),
    note("top: false", x - 13, 12),
    note("bottom: false", x - 13, 9),
    note("top: true", x + 13, 12),
    note("bottom: true", x + 13, 9),
    note("is_tented: false", x + 39, 11),
    inherited,
    exposed,
    tented,
    legacy,
    note(`Expect ${inheritedState}`, x - 39, -1),
    note("Expect EXPOSED", x - 13, -1),
    note("Expect TENTED", x + 13, -1),
    note("Expect EXPOSED", x + 39, -1),
    note("pcb_trace.route vias (same nested group)", x, -8, 2.4),
    note("top: unset", x - 39, -12),
    note("bottom: unset", x - 39, -15),
    note("top: false", x - 13, -12),
    note("bottom: false", x - 13, -15),
    note("top: true", x + 13, -12),
    note("bottom: true", x + 13, -15),
    note("Route: true; via: false", x + 39, -13, 1.8),
    trace,
    duplicate,
    note(`Expect ${inheritedState}`, x - 39, -25),
    note("Expect EXPOSED", x - 13, -25),
    note("Expect TENTED", x + 13, -25),
    note("EXPOSED (no duplicate)", x + 39, -25, 1.6),
  ]
}
