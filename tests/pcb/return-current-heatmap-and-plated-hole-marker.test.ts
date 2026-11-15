import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createReturnCurrentSvgObjects } from "lib/pcb/return-current/create-return-current-svg-objects"
import { scale } from "transformation-matrix"

test("createReturnCurrentSvgObjects normalizes and mirrors asymmetric flipped heatmap bounds", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_rc",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp_rc",
      name: "Return Current",
      experiment_type: "pcb_return_current",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_sig",
      route: [
        { route_type: "wire", x: -2, y: 0, width: 0.25, layer: "top" },
        { route_type: "wire", x: 2, y: 0, width: 0.25, layer: "top" },
      ],
    },
    {
      type: "simulation_return_current_excitation",
      simulation_return_current_excitation_id: "exc_1",
      simulation_experiment_id: "exp_rc",
      pcb_trace_id: "trace_sig",
      ground_source_net_id: "net_gnd",
      current: 0.05,
      return_source: {
        contact_type: "pcb_port",
        pcb_port_id: "port_th_1",
        x: -2,
        y: 0,
        layer: "bottom",
      },
      return_sink: {
        contact_type: "pcb_port",
        pcb_port_id: "port_th_1",
        x: -2,
        y: 0,
        layer: "bottom",
      },
    },
    {
      type: "simulation_pcb_return_current_result",
      simulation_pcb_return_current_result_id: "res_rc",
      simulation_experiment_id: "exp_rc",
      pcb_board_id: "board_rc",
      simulation_return_current_excitation_ids: ["exc_1"],
      frequency_hz: 1e6,
    },
    {
      type: "simulation_pcb_return_current_heatmap",
      simulation_pcb_return_current_heatmap_id: "hm_1",
      simulation_pcb_return_current_result_id: "res_rc",
      layer: "bottom",
      source_net_id: "net_gnd",
      min_x: -2,
      min_y: -1,
      max_x: 6,
      max_y: 5,
      image_asset: {
        project_relative_path: "heat.png",
        mimetype: "image/png",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8AARIQB4QkA+fsD/c26L6AAAAAASUVORK5CYII=",
      },
    },
  ]

  const objects = createReturnCurrentSvgObjects({
    circuitJson,
    ctx: {
      transform: scale(-10, -10),
      layer: "bottom",
      colorMap: DEFAULT_PCB_COLOR_MAP,
      circuitJson,
    },
    resultId: "res_rc",
    width: 800,
    height: 600,
  })

  const root = objects[0]!
  const imageNode = root.children.find((child) => child.name === "image")
  expect(imageNode?.attributes.x).toBe("-60")
  expect(imageNode?.attributes.y).toBe("-50")
  expect(imageNode?.attributes.width).toBe("80")
  expect(imageNode?.attributes.height).toBe("60")
  expect(imageNode?.attributes.transform).toBe("translate(-40, 0) scale(-1, 1)")
})

test("createReturnCurrentSvgObjects highlights plated hole pads with markerColor for pcb_port return-current markers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_rc",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp_rc",
      name: "Return Current",
      experiment_type: "pcb_return_current",
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_th_1",
      pcb_component_id: "comp_1",
      source_port_id: "sp_1",
      x: -2,
      y: 0,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_rc_1",
      pcb_port_id: "port_th_1",
      shape: "circle",
      x: -2,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_sig",
      route: [
        { route_type: "wire", x: -2, y: 0, width: 0.25, layer: "top" },
        { route_type: "wire", x: 2, y: 0, width: 0.25, layer: "top" },
      ],
    },
    {
      type: "simulation_return_current_excitation",
      simulation_return_current_excitation_id: "exc_1",
      simulation_experiment_id: "exp_rc",
      pcb_trace_id: "trace_sig",
      ground_source_net_id: "net_gnd",
      current: 0.05,
      return_source: {
        contact_type: "pcb_port",
        pcb_port_id: "port_th_1",
        x: -2,
        y: 0,
        layer: "bottom",
      },
      return_sink: {
        contact_type: "pcb_port",
        pcb_port_id: "port_th_1",
        x: -2,
        y: 0,
        layer: "bottom",
      },
    },
    {
      type: "simulation_pcb_return_current_result",
      simulation_pcb_return_current_result_id: "res_rc",
      simulation_experiment_id: "exp_rc",
      pcb_board_id: "board_rc",
      simulation_return_current_excitation_ids: ["exc_1"],
      frequency_hz: 1e6,
    },
    {
      type: "simulation_pcb_return_current_heatmap",
      simulation_pcb_return_current_heatmap_id: "hm_1",
      simulation_pcb_return_current_result_id: "res_rc",
      layer: "bottom",
      source_net_id: "net_gnd",
      min_x: -5,
      min_y: -5,
      max_x: 5,
      max_y: 5,
      image_asset: {
        project_relative_path: "heat.png",
        mimetype: "image/png",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8AARIQB4QkA+fsD/c26L6AAAAAASUVORK5CYII=",
      },
    },
    {
      type: "simulation_pcb_return_current_marker",
      simulation_pcb_return_current_marker_id: "mk_1",
      simulation_pcb_return_current_result_id: "res_rc",
      target_type: "pcb_port",
      pcb_port_id: "port_th_1",
      layer: "bottom",
      role: "return_sink",
      label: "Return",
      label_x: -2,
      label_y: 1,
    },
  ]

  const objects = createReturnCurrentSvgObjects({
    circuitJson,
    ctx: {
      transform: scale(10, -10),
      layer: "bottom",
      colorMap: DEFAULT_PCB_COLOR_MAP,
      circuitJson,
    },
    resultId: "res_rc",
    width: 800,
    height: 600,
  })
  const root = objects[0]!
  const markerNode = root.children.find(
    (child) =>
      child.attributes["data-type"] === "simulation_pcb_return_current_marker",
  )
  const platedHoleGroup = markerNode?.children.find(
    (child) => child.attributes["data-type"] === "pcb_plated_hole",
  )
  expect(platedHoleGroup).toBeDefined()
  const outerRing = platedHoleGroup?.children.find(
    (child) => child.attributes.class === "pcb-hole-outer",
  )
  expect(outerRing?.attributes.fill).toBe("#ed80e6")
  expect(outerRing?.attributes.cx).toBe("-20")
  expect(outerRing?.attributes.cy).toBe("0")
})
