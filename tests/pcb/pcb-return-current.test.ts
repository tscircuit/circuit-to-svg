import { expect, test } from "bun:test"
import { gzipSync } from "node:zlib"
import type {
  AnyCircuitElement,
  SimulationPcbReturnCurrentField,
  SimulationReturnCurrentGridJson,
} from "circuit-json"
import {
  convertCircuitJsonToPcbSimulationSvg,
  convertCircuitJsonToPcbSvg,
} from "lib"

const grid: SimulationReturnCurrentGridJson = {
  field_type: "complex_phasor",
  sheet_current_x_real: [0.02, null, 0, 0.01],
  sheet_current_x_imag: [0, null, 0, 0],
  sheet_current_y_real: [0, null, 0, 0],
  sheet_current_y_imag: [0, null, 0, 0.02],
}
const asset = (value: unknown) => ({
  project_relative_path: "fields/inner1.json",
  mimetype: "application/json",
  url: `data:application/json;base64,${Buffer.from(JSON.stringify(value)).toString("base64")}`,
})
const field: SimulationPcbReturnCurrentField = {
  type: "simulation_pcb_return_current_field",
  simulation_pcb_return_current_field_id: "field_1",
  simulation_pcb_return_current_result_id: "result_1",
  layer: "inner1",
  source_net_id: "ground",
  field_type: "complex_phasor",
  min_x: -1,
  min_y: -1,
  columns: 2,
  rows: 2,
  cell_width: 1,
  cell_height: 1,
  copper_thickness: 0.02,
  data_format: "simulation_return_current_grid_json_v1",
  field_asset: asset(grid),
}
const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 6,
    height: 4,
    material: "fr4",
    num_layers: 4,
    thickness: 1.6,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "signal",
    route: [
      { route_type: "wire", x: -2, y: -1, width: 0.2, layer: "top" },
      { route_type: "wire", x: -1, y: -1, width: 0.2, layer: "top" },
      {
        route_type: "via",
        x: -1,
        y: -1,
        from_layer: "top",
        to_layer: "bottom",
      },
      { route_type: "wire", x: -1, y: -1, width: 0.2, layer: "bottom" },
      { route_type: "wire", x: 1, y: 1, width: 0.2, layer: "bottom" },
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "signal_pad",
    source_port_id: "source_signal",
    x: -2,
    y: -1,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "ground_pad",
    source_port_id: "source_ground",
    x: 2,
    y: 1,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_signal",
    pcb_component_id: "component",
    pcb_port_id: "signal_pad",
    shape: "circle",
    x: -2,
    y: -1,
    radius: 0.2,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_ground",
    pcb_component_id: "component",
    pcb_port_id: "ground_pad",
    shape: "circle",
    x: 2,
    y: 1,
    radius: 0.2,
    layer: "top",
  },
  {
    type: "pcb_via",
    pcb_via_id: "transition",
    x: -1,
    y: -1,
    layers: ["top", "bottom"],
    outer_diameter: 0.5,
    hole_diameter: 0.2,
  },
  {
    type: "simulation_experiment",
    simulation_experiment_id: "experiment",
    name: "Return-current fixture",
    experiment_type: "pcb_return_current",
  },
  {
    type: "simulation_return_current_excitation",
    simulation_return_current_excitation_id: "excitation",
    simulation_experiment_id: "experiment",
    pcb_trace_id: "signal",
    ground_source_net_id: "ground",
    current: 0.02,
    return_source: {
      contact_type: "pcb_port",
      pcb_port_id: "ground_pad",
      x: 2,
      y: 1,
      layer: "top",
    },
    return_sink: {
      contact_type: "pcb_port",
      pcb_port_id: "ground_pad",
      x: 2,
      y: 1,
      layer: "top",
    },
  },
  {
    type: "simulation_pcb_return_current_result",
    simulation_pcb_return_current_result_id: "result_1",
    simulation_experiment_id: "experiment",
    pcb_board_id: "board",
    simulation_return_current_excitation_ids: ["excitation"],
    frequency_hz: 400e6,
  },
  field,
  {
    type: "simulation_pcb_return_current_marker",
    simulation_pcb_return_current_marker_id: "source",
    simulation_pcb_return_current_result_id: "result_1",
    target_type: "pcb_port",
    pcb_port_id: "signal_pad",
    layer: "top",
    role: "signal_source",
    label: "Signal source",
    label_x: -2,
    label_y: -0.4,
  },
  {
    type: "simulation_pcb_return_current_marker",
    simulation_pcb_return_current_marker_id: "return",
    simulation_pcb_return_current_result_id: "result_1",
    target_type: "pcb_port",
    pcb_port_id: "ground_pad",
    layer: "top",
    role: "return_source",
    label: "Actual GND pad",
    label_x: 0.8,
    label_y: 1.4,
  },
  {
    type: "simulation_pcb_return_current_marker",
    simulation_pcb_return_current_marker_id: "via",
    simulation_pcb_return_current_result_id: "result_1",
    target_type: "pcb_via",
    pcb_via_id: "transition",
    from_layer: "top",
    to_layer: "bottom",
    role: "signal_transition",
    label: "Top → bottom",
    label_x: -0.5,
    label_y: -1.5,
  },
  {
    ...field,
    simulation_pcb_return_current_field_id: "unrelated_field",
    simulation_pcb_return_current_result_id: "other_result",
    field_asset: { ...asset({}), url: "https://example.com/not-loaded.json" },
  },
]
const options = {
  simulationResultId: "result_1",
  layer: "inner1" as const,
  width: 800,
  height: 550,
  includeVersion: false,
  returnCurrent: { showVectors: true, fieldData: { field_1: grid } },
}

test("return-current overlays are opt-in and select one result", () => {
  expect(convertCircuitJsonToPcbSvg(circuit)).not.toContain(
    "data-simulation-result-id=",
  )
  const svg = convertCircuitJsonToPcbSvg(circuit, options)
  expect(svg).toContain('data-simulation-result-id="result_1"')
  expect(svg).not.toContain("not-loaded.json")
  expect(svg).toContain("400 MHz")
  expect(svg).toContain("A/mm²")
  expect(svg).toContain('data-pcb-trace-id="signal"')
  expect(svg).toContain('stroke="#08d9ef"')
  expect(svg).toContain('stroke="#ff941f"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("masked cells stay empty, zero-current copper stays present, and density uses thickness", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, options)
  expect(
    svg.match(/data-type="simulation_pcb_return_current_cell"/g),
  ).toHaveLength(3)
  expect(svg).not.toContain('data-grid-index="1"')
  expect(svg).toContain('data-current-density="0"')
  expect(svg).toContain('data-current-density="1"') // .02 A/mm / .02 mm
  const bottom = Number(/y="([^"]+)"[^>]*data-grid-index="0"/.exec(svg)?.[1])
  const top = Number(/y="([^"]+)"[^>]*data-grid-index="2"/.exec(svg)?.[1])
  expect(bottom).toBeGreaterThan(top)
})

test("complex vectors use exp(+jωt) while magnitude is phase-independent", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    ...options,
    returnCurrent: { ...options.returnCurrent, phaseDegrees: 90 },
  })
  expect(svg).toContain('data-sheet-current-y="-0.02"')
  expect(svg).toContain(
    `data-current-density="${Math.hypot(0.01, 0.02) / 0.02}"`,
  )
})

test("port markers resolve actual separate coordinates and identify the target", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, options)
  const signal =
    /data-role="signal_source"[^>]*data-target-id="signal_pad"[^>]*>[\s\S]*?<circle cx="([^"]+)" cy="([^"]+)"/.exec(
      svg,
    )
  const ground =
    /data-role="return_source"[^>]*data-target-id="ground_pad"[^>]*>[\s\S]*?<circle cx="([^"]+)" cy="([^"]+)"/.exec(
      svg,
    )
  expect(signal).not.toBeNull()
  expect(ground).not.toBeNull()
  expect(signal?.slice(1)).not.toEqual(ground?.slice(1))
})

test("plain and gzip embedded fields produce the same SVG", async () => {
  const plain = await convertCircuitJsonToPcbSimulationSvg(circuit, {
    ...options,
    returnCurrent: { showVectors: true },
  })
  const gzipped = circuit.map((element) =>
    element === field
      ? {
          ...field,
          field_asset: {
            project_relative_path: "fields/inner1.json.gz",
            mimetype: "application/gzip",
            url: `data:application/gzip;base64,${gzipSync(JSON.stringify(grid)).toString("base64")}`,
          },
        }
      : element,
  )
  const gzip = await convertCircuitJsonToPcbSimulationSvg(gzipped, {
    ...options,
    returnCurrent: { showVectors: true },
  })
  expect(gzip).toBe(plain)
})

test("external fields require an explicit resolver and only selected assets are resolved", async () => {
  const external = circuit.map((element) =>
    element === field
      ? {
          ...field,
          field_asset: {
            ...field.field_asset,
            url: "https://example.com/selected.json",
          },
        }
      : element,
  )
  await expect(
    convertCircuitJsonToPcbSimulationSvg(external, {
      ...options,
      returnCurrent: undefined,
    }),
  ).rejects.toThrow("requires resolveAsset")
  const requests: string[] = []
  const svg = await convertCircuitJsonToPcbSimulationSvg(external, {
    ...options,
    returnCurrent: undefined,
    resolveAsset: async (asset) => {
      requests.push(asset.url)
      return JSON.stringify(grid)
    },
  })
  expect(requests).toEqual(["https://example.com/selected.json"])
  expect(svg).toContain('data-current-density="1"')
})

const image = {
  type: "simulation_pcb_return_current_heatmap" as const,
  simulation_pcb_return_current_heatmap_id: "image",
  simulation_pcb_return_current_result_id: "result_1",
  layer: "inner1" as const,
  source_net_id: "ground",
  min_x: -1,
  min_y: -1,
  max_x: 1,
  max_y: 1,
  image_asset: {
    project_relative_path: "heat.png",
    mimetype: "image/png",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  },
}

test("image bounds map top-left to (min_x,max_y) and render without decoded grids", () => {
  const svg = convertCircuitJsonToPcbSvg([...circuit, image], {
    ...options,
    returnCurrent: undefined,
  })
  expect(svg).toContain('data-type="simulation_pcb_return_current_heatmap"')
  expect(svg).toContain('preserveAspectRatio="none"')
  expect(svg).not.toContain('data-type="simulation_pcb_return_current_cell"')
})

test("an explicit density range replaces a stored image and displays its numeric scale", () => {
  const svg = convertCircuitJsonToPcbSvg([...circuit, image], {
    ...options,
    returnCurrent: {
      ...options.returnCurrent,
      densityRange: { min: 0.25, max: 2 },
    },
  })
  expect(svg).not.toContain('data-type="simulation_pcb_return_current_heatmap"')
  expect(
    svg.match(/data-type="simulation_pcb_return_current_cell"/g),
  ).toHaveLength(3)
  expect(svg).toContain("0.250 – 2.00 A/mm²")
  expect(svg).toContain('data-current-density="1"')
})

test("invalid or missing results/assets fail explicitly", () => {
  expect(() =>
    convertCircuitJsonToPcbSvg(
      circuit.filter((el) => el.type !== "simulation_experiment"),
      options,
    ),
  ).toThrow("Missing PCB return-current experiment")
  expect(() =>
    convertCircuitJsonToPcbSvg(
      circuit.filter(
        (el) => el.type !== "pcb_port" || el.pcb_port_id !== "ground_pad",
      ),
      options,
    ),
  ).toThrow("Missing pcb_port")
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      simulationResultId: "missing",
    }),
  ).toThrow("Expected one")
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, { ...options, layer: "inner2" }),
  ).toThrow("No return-current")
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      returnCurrent: undefined,
    }),
  ).toThrow("decoded fieldData")
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      returnCurrent: {
        fieldData: { field_1: { ...grid, sheet_current_x_real: [0] } },
      },
    }),
  ).toThrow()
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      returnCurrent: { opacity: 2 },
    }),
  ).toThrow("opacity")
})
