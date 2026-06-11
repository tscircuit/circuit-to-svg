import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToBlockDiagramSvg } from "lib"

const subcircuitCircuitJson = [
  {
    type: "source_group",
    source_group_id: "source_group_sensor",
    is_subcircuit: true,
    subcircuit_id: "subcircuit_sensor_frontend",
    name: "Sensor Frontend",
  },
  {
    type: "source_group",
    source_group_id: "source_group_controller",
    is_subcircuit: true,
    subcircuit_id: "subcircuit_controller",
    name: "Controller",
  },
  {
    type: "source_net",
    source_net_id: "source_net_vdd",
    name: "VDD",
  },
  {
    type: "source_net",
    source_net_id: "source_net_gnd",
    name: "GND",
  },
  {
    type: "source_component",
    source_component_id: "source_component_u1",
    name: "U1",
    ftype: "simple_chip",
    source_group_id: "source_group_sensor",
  },
  {
    type: "source_component",
    source_component_id: "source_component_c1",
    name: "C1",
    ftype: "capacitor",
    source_group_id: "source_group_sensor",
  },
  {
    type: "source_component",
    source_component_id: "source_component_r1",
    name: "R1",
    ftype: "resistor",
    source_group_id: "source_group_sensor",
  },
  {
    type: "source_component",
    source_component_id: "source_component_u2",
    name: "U2",
    ftype: "simple_chip",
    source_group_id: "source_group_controller",
  },
  {
    type: "source_component",
    source_component_id: "source_component_c2",
    name: "C2",
    ftype: "capacitor",
    source_group_id: "source_group_controller",
  },
  {
    type: "source_component",
    source_component_id: "source_component_r2",
    name: "R2",
    ftype: "resistor",
    source_group_id: "source_group_controller",
  },
  ...createPorts("source_component_u1", "subcircuit_sensor_frontend", "U1", [
    "VDD",
    "GND",
    "SDA",
    "SCL",
    "INT",
  ]),
  ...createPorts("source_component_c1", "subcircuit_sensor_frontend", "C1", [
    "pin1",
    "pin2",
  ]),
  ...createPorts("source_component_r1", "subcircuit_sensor_frontend", "R1", [
    "pin1",
    "pin2",
  ]),
  ...createPorts("source_component_u2", "subcircuit_controller", "U2", [
    "VDD",
    "GND",
    "SDA",
    "SCL",
    "IRQ",
  ]),
  ...createPorts("source_component_c2", "subcircuit_controller", "C2", [
    "pin1",
    "pin2",
  ]),
  ...createPorts("source_component_r2", "subcircuit_controller", "R2", [
    "pin1",
    "pin2",
  ]),
  createTrace(
    "source_trace_sensor_vdd",
    ["U1.VDD", "C1.pin1", "R1.pin1"],
    ["source_net_vdd"],
  ),
  createTrace(
    "source_trace_sensor_gnd",
    ["U1.GND", "C1.pin2"],
    ["source_net_gnd"],
  ),
  createTrace(
    "source_trace_controller_vdd",
    ["U2.VDD", "C2.pin1", "R2.pin1"],
    ["source_net_vdd"],
  ),
  createTrace(
    "source_trace_controller_gnd",
    ["U2.GND", "C2.pin2"],
    ["source_net_gnd"],
  ),
  createTrace("source_trace_i2c_sda", ["U1.SDA", "U2.SDA"], [], "SDA"),
  createTrace("source_trace_i2c_scl", ["U1.SCL", "U2.SCL"], [], "SCL"),
  createTrace("source_trace_interrupt", ["U1.INT", "U2.IRQ"], [], "INT"),
] as AnyCircuitElement[]

test("subcircuits are summarized as port-aware blocks", () => {
  expect(
    convertCircuitJsonToBlockDiagramSvg(subcircuitCircuitJson, {
      width: 960,
      height: 640,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

const twoSubcircuitsWithPassiveCircuitJson = [
  {
    type: "source_group",
    source_group_id: "source_group_radio",
    is_subcircuit: true,
    subcircuit_id: "subcircuit_radio",
    name: "Radio",
  },
  {
    type: "source_group",
    source_group_id: "source_group_mcu",
    is_subcircuit: true,
    subcircuit_id: "subcircuit_mcu",
    name: "MCU",
  },
  {
    type: "source_net",
    source_net_id: "source_net_vdd_two",
    name: "VDD",
  },
  {
    type: "source_net",
    source_net_id: "source_net_gnd_two",
    name: "GND",
  },
  {
    type: "source_component",
    source_component_id: "source_component_u_radio",
    name: "U1",
    ftype: "simple_chip",
    source_group_id: "source_group_radio",
  },
  {
    type: "source_component",
    source_component_id: "source_component_u_mcu",
    name: "U2",
    ftype: "simple_chip",
    source_group_id: "source_group_mcu",
  },
  {
    type: "source_component",
    source_component_id: "source_component_r_pullup",
    name: "R1",
    ftype: "resistor",
  },
  ...createPorts("source_component_u_radio", "subcircuit_radio", "U1", [
    "VDD",
    "GND",
    "SDA",
    "SCL",
    "INT",
  ]),
  ...createPorts("source_component_u_mcu", "subcircuit_mcu", "U2", [
    "VDD",
    "GND",
    "SDA",
    "SCL",
    "IRQ",
  ]),
  ...createPorts("source_component_r_pullup", undefined, "R1", [
    "pin1",
    "pin2",
  ]),
  createTrace(
    "source_trace_two_vdd",
    ["U1.VDD", "U2.VDD", "R1.pin1"],
    ["source_net_vdd_two"],
  ),
  createTrace(
    "source_trace_two_gnd",
    ["U1.GND", "U2.GND"],
    ["source_net_gnd_two"],
  ),
  createTrace("source_trace_two_sda", ["U1.SDA", "U2.SDA"], [], "SDA"),
  createTrace("source_trace_two_scl", ["U1.SCL", "U2.SCL"], [], "SCL"),
  createTrace(
    "source_trace_two_int",
    ["U1.INT", "R1.pin2", "U2.IRQ"],
    [],
    "INT",
  ),
] as AnyCircuitElement[]

test("two subcircuits keep an external passive as its own block", () => {
  expect(
    convertCircuitJsonToBlockDiagramSvg(twoSubcircuitsWithPassiveCircuitJson, {
      width: 980,
      height: 660,
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-two-subcircuits-passive`)
})

const oneSubcircuitWithPassiveCircuitJson = [
  {
    type: "source_group",
    source_group_id: "source_group_sensor_module",
    is_subcircuit: true,
    subcircuit_id: "subcircuit_sensor_module",
    name: "Sensor Module",
  },
  {
    type: "source_net",
    source_net_id: "source_net_vdd_one",
    name: "VDD",
  },
  {
    type: "source_net",
    source_net_id: "source_net_gnd_one",
    name: "GND",
  },
  {
    type: "source_component",
    source_component_id: "source_component_u_sensor",
    name: "U1",
    ftype: "simple_chip",
    source_group_id: "source_group_sensor_module",
  },
  {
    type: "source_component",
    source_component_id: "source_component_r_series",
    name: "R1",
    ftype: "resistor",
  },
  ...createPorts(
    "source_component_u_sensor",
    "subcircuit_sensor_module",
    "U1",
    ["VDD", "GND", "TX", "RX"],
  ),
  ...createPorts("source_component_r_series", undefined, "R1", [
    "pin1",
    "pin2",
  ]),
  createTrace(
    "source_trace_one_vdd",
    ["U1.VDD", "R1.pin1"],
    ["source_net_vdd_one"],
  ),
  createTrace("source_trace_one_gnd", ["U1.GND"], ["source_net_gnd_one"]),
  createTrace("source_trace_one_rx", ["U1.RX", "R1.pin2"], [], "RX"),
] as AnyCircuitElement[]

test("one subcircuit keeps an external passive as its own block", () => {
  expect(
    convertCircuitJsonToBlockDiagramSvg(oneSubcircuitWithPassiveCircuitJson, {
      width: 860,
      height: 520,
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-one-subcircuit-passive`)
})

function createPorts(
  sourceComponentId: string,
  subcircuitId: string | undefined,
  componentName: string,
  portNames: string[],
): AnyCircuitElement[] {
  return portNames.map((portName) => ({
    type: "source_port",
    source_port_id: `${componentName}.${portName}`,
    name: portName,
    source_component_id: sourceComponentId,
    ...(subcircuitId ? { subcircuit_id: subcircuitId } : {}),
  })) as AnyCircuitElement[]
}

function createTrace(
  sourceTraceId: string,
  connectedSourcePortIds: string[],
  connectedSourceNetIds: string[] = [],
  displayName?: string,
): AnyCircuitElement {
  return {
    type: "source_trace",
    source_trace_id: sourceTraceId,
    connected_source_port_ids: connectedSourcePortIds,
    connected_source_net_ids: connectedSourceNetIds,
    display_name: displayName,
  } as AnyCircuitElement
}
