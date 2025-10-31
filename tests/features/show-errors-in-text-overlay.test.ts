import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPinoutSvg,
  convertCircuitJsonToSolderPasteMask,
  convertCircuitJsonToSchematicSimulationSvg,
} from "lib"
import type { AnyCircuitElement } from "circuit-json"

const circuitJsonWithError: AnyCircuitElement[] = [
  {
    type: "source_board",
    source_board_id: "source_board_1",
    source_group_id: "source_group_0",
    title: "My Awesome Board",
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    thickness: 1.6,
    material: "fr1",
  },
  {
    type: "pcb_missing_footprint_error",
    pcb_missing_footprint_error_id: "pcb_missing_footprint_error_0",
    message: 'No footprint found for component: <resistor#0 name=".R1" />',
    source_component_id: "source_component_0",
    error_type: "pcb_missing_footprint_error",
  },
  {
    type: "pcb_footprint_overlap_error",
    pcb_error_id: "overlap_error_0",
    error_type: "pcb_footprint_overlap_error",
    message: "SMT pads and plated hole overlap detected",
    pcb_smtpad_ids: ["pcb_smtpad_0", "pcb_smtpad_1"],
    pcb_plated_hole_ids: ["pcb_plated_hole_0"],
  },
  {
    type: "source_component",
    source_component_id: "source_component_r1",
    name: "R1",
    ftype: "simple_resistor",
    resistance: 40,
  },
  {
    type: "source_port",
    source_port_id: "source_port_r1_p1",
    name: "p1",
    source_component_id: "source_component_r1",
  },
  {
    type: "source_port",
    source_port_id: "source_port_r1_p2",
    name: "p2",
    source_component_id: "source_component_r1",
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_r1",
    source_component_id: "source_component_r1",
    center: { x: 0, y: 3 },
    is_box_with_pins: true,
    size: { width: 1, height: 0.4 },
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_r1_p1",
    source_port_id: "source_port_r1_p1",
    schematic_component_id: "schematic_component_r1",
    center: { x: -0.9, y: 3 },
    side_of_component: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_r1_p2",
    source_port_id: "source_port_r1_p2",
    schematic_component_id: "schematic_component_r1",
    center: { x: 0.9, y: 3 },
    side_of_component: "right",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_r1",
    source_component_id: "source_component_r1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 1.2,
    height: 0.6,
    obstructs_within_bounds: false,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_r1_1",
    shape: "rect",
    x: -0.5,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_component_id: "pcb_component_r1",
    pcb_port_id: "pcb_port_r1_p1",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_r1_2",
    shape: "rect",
    x: 0.5,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_component_id: "pcb_component_r1",
    pcb_port_id: "pcb_port_r1_p2",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_r1_p1",
    source_port_id: "source_port_r1_p1",
    pcb_component_id: "pcb_component_r1",
    layers: ["top"],
    x: -0.5,
    y: 0,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_r1_p2",
    source_port_id: "source_port_r1_p2",
    pcb_component_id: "pcb_component_r1",
    layers: ["top"],
    x: 0.5,
    y: 0,
  },
  {
    type: "simulation_experiment",
    simulation_experiment_id: "error_sim_exp_1",
    name: "Error Simulation",
    experiment_type: "spice_transient_analysis",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "error_sim_graph_1",
    simulation_experiment_id: "error_sim_exp_1",
    start_time_ms: 0,
    end_time_ms: 1,
    time_per_step: 1,
    voltage_levels: [0, 1],
  },
]

test("showErrorsInTextOverlay for pcb svg", async () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJsonWithError, {
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-svg")
})

test("showErrorsInTextOverlay for schematic svg", async () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithError, {
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "schematic-svg")
})

test("showErrorsInTextOverlay for assembly svg", async () => {
  const soup = [...circuitJsonWithError]
  soup.push(
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_simple_1",
      source_component_id: "simple_bug_1",
      center: { x: 1, y: 1 },
      width: 1,
      height: 1,
      layer: "top",
      obstructs_within_bounds: false,
      rotation: 0,
    },
    {
      type: "source_component",
      source_component_id: "simple_bug_1",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_simple_1",
      source_port_id: "bug_port_1",
      x: 0,
      y: 0,
      layers: ["top"],
    },
  )
  const svg = convertCircuitJsonToAssemblySvg(soup, {
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "assembly-svg")
})

test("showErrorsInTextOverlay for pinout svg", async () => {
  const soup = [...circuitJsonWithError]
  soup.push(
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "P1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      x: 0,
      y: 0,
      is_board_pinout: true,
      layers: ["top"],
    },
  )
  const svg = convertCircuitJsonToPinoutSvg(soup, {
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "pinout-svg")
})

test("showErrorsInTextOverlay for solder paste mask", async () => {
  const svg = convertCircuitJsonToSolderPasteMask(circuitJsonWithError, {
    layer: "top",
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "solder-paste-mask")
})

test("showErrorsInTextOverlay for schematic simulation svg", async () => {
  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: circuitJsonWithError,
    simulation_experiment_id: "error_sim_exp_1",
    showErrorsInTextOverlay: true,
  })
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "schematic-simulation-svg",
  )
})
