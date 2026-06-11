import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToBlockDiagramSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib"
import { stackSvgComparison } from "tests/block-diagram/stack-svg-comparison"

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
  expectStackedSchematicAndBlockSnapshot({
    circuitJson: addSchematicComparisonElements(subcircuitCircuitJson, {
      U1: { x: -2.2, y: 0.8 },
      C1: { x: -5, y: -1.4 },
      R1: { x: -5, y: 2.5 },
      U2: { x: 2.2, y: 0.8 },
      C2: { x: 5, y: -1.4 },
      R2: { x: 5, y: 2.5 },
    }),
    snapshotName: import.meta.path,
    blockDiagramOptions: {
      width: 960,
      height: 640,
    },
  })
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
  expectStackedSchematicAndBlockSnapshot({
    circuitJson: addSchematicComparisonElements(
      twoSubcircuitsWithPassiveCircuitJson,
      {
        U1: { x: -2.4, y: 0.6 },
        U2: { x: 2.4, y: 0.6 },
        R1: { x: 0, y: 2.7 },
      },
    ),
    snapshotName: `${import.meta.path}-two-subcircuits-passive`,
    blockDiagramOptions: {
      width: 980,
      height: 660,
    },
  })
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
  expectStackedSchematicAndBlockSnapshot({
    circuitJson: addSchematicComparisonElements(
      oneSubcircuitWithPassiveCircuitJson,
      {
        U1: { x: -1.5, y: 0.4 },
        R1: { x: 2, y: 1.7 },
      },
    ),
    snapshotName: `${import.meta.path}-one-subcircuit-passive`,
    blockDiagramOptions: {
      width: 860,
      height: 520,
    },
  })
})

function expectStackedSchematicAndBlockSnapshot({
  circuitJson,
  snapshotName,
  blockDiagramOptions,
}: {
  circuitJson: AnyCircuitElement[]
  snapshotName: string
  blockDiagramOptions: { width: number; height: number }
}) {
  const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 900,
    height: 420,
    grid: {
      cellSize: 1,
      labelCells: true,
    },
  })
  const blockDiagramSvg = convertCircuitJsonToBlockDiagramSvg(
    circuitJson,
    blockDiagramOptions,
  )

  expect(
    stackSvgComparison({
      schematicSvg,
      blockDiagramSvg,
    }),
  ).toMatchSvgSnapshot(snapshotName)
}

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

function addSchematicComparisonElements(
  circuitJson: AnyCircuitElement[],
  componentPositions: Record<string, { x: number; y: number }>,
): AnyCircuitElement[] {
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
  )
  const sourcePorts = circuitJson.filter(
    (element) => element.type === "source_port",
  )
  const sourceTraces = circuitJson.filter(
    (element) => element.type === "source_trace",
  )
  const sourceNets = circuitJson.filter(
    (element) => element.type === "source_net",
  )
  const sourceNetById = new Map(
    sourceNets.map((sourceNet) => [sourceNet.source_net_id, sourceNet]),
  )
  const schematicComponents: AnyCircuitElement[] = []
  const schematicPorts: AnyCircuitElement[] = []
  const schematicTexts: AnyCircuitElement[] = []
  const schematicNetLabels: AnyCircuitElement[] = []
  const generatedSourceNets: AnyCircuitElement[] = []
  const schematicPortsBySourcePortId = new Map<
    string,
    {
      center: { x: number; y: number }
      side: "left" | "right"
    }
  >()

  for (const sourceComponent of sourceComponents) {
    const componentName = "name" in sourceComponent ? sourceComponent.name : ""
    if (!componentName || !componentPositions[componentName]) continue

    const componentPorts = sourcePorts.filter(
      (sourcePort) =>
        "source_component_id" in sourcePort &&
        sourcePort.source_component_id === sourceComponent.source_component_id,
    )
    const isChip =
      "ftype" in sourceComponent &&
      String(sourceComponent.ftype ?? "").includes("chip")
    const size = isChip
      ? { width: 2.4, height: Math.max(1.8, componentPorts.length * 0.34) }
      : { width: 1.35, height: 0.72 }
    const center = componentPositions[componentName]
    const schematicComponentId = `schematic_component_${sourceComponent.source_component_id}`

    schematicComponents.push({
      type: "schematic_component",
      schematic_component_id: schematicComponentId,
      center,
      size,
      source_component_id: sourceComponent.source_component_id,
    } as AnyCircuitElement)

    schematicTexts.push({
      type: "schematic_text",
      schematic_text_id: `schematic_text_${sourceComponent.source_component_id}`,
      schematic_component_id: schematicComponentId,
      text: componentName,
      position: {
        x: center.x - size.width / 2,
        y: center.y + size.height / 2 + 0.28,
      },
      anchor: "bottom_left",
      font_size: 0.18,
      rotation: 0,
      color: "rgb(0, 100, 100)",
    } as AnyCircuitElement)

    const leftPorts = componentPorts.filter((sourcePort) =>
      isLeftSideSchematicPort(sourcePort.name),
    )
    const rightPorts = componentPorts.filter(
      (sourcePort) => !isLeftSideSchematicPort(sourcePort.name),
    )

    for (const sourcePort of componentPorts) {
      const side = isLeftSideSchematicPort(sourcePort.name) ? "left" : "right"
      const sidePorts = side === "left" ? leftPorts : rightPorts
      const sidePortIndex = sidePorts.findIndex(
        (sidePort) => sidePort.source_port_id === sourcePort.source_port_id,
      )
      const y = getPortY(center.y, sidePorts.length, sidePortIndex)
      const x =
        side === "left"
          ? center.x - size.width / 2 - 0.42
          : center.x + size.width / 2 + 0.42
      const portCenter = { x, y }
      const schematicPortId = `schematic_port_${sourcePort.source_port_id}`

      schematicPorts.push({
        type: "schematic_port",
        schematic_port_id: schematicPortId,
        schematic_component_id: schematicComponentId,
        center: portCenter,
        source_port_id: sourcePort.source_port_id,
        side_of_component: side,
        facing_direction: side,
        distance_from_component_edge: 0.42,
        display_pin_label: sourcePort.name,
      } as AnyCircuitElement)
      schematicPortsBySourcePortId.set(sourcePort.source_port_id, {
        center: portCenter,
        side,
      })
    }
  }

  for (const [traceIndex, sourceTrace] of sourceTraces.entries()) {
    const connectedSourcePortIds =
      "connected_source_port_ids" in sourceTrace
        ? sourceTrace.connected_source_port_ids
        : []
    const label = getSourceTraceLabel(sourceTrace, sourceNetById)
    if (!label) continue

    const sourceNetId = getSchematicLabelSourceNetId(
      sourceTrace,
      label,
      sourceNetById,
      generatedSourceNets,
    )

    for (const [portIndex, sourcePortId] of connectedSourcePortIds.entries()) {
      const schematicPort = schematicPortsBySourcePortId.get(sourcePortId)
      if (!schematicPort) continue

      schematicNetLabels.push({
        type: "schematic_net_label",
        schematic_net_label_id: `schematic_net_label_${traceIndex}_${portIndex}`,
        source_net_id: sourceNetId,
        source_trace_id: sourceTrace.source_trace_id,
        center: schematicPort.center,
        anchor_position: schematicPort.center,
        anchor_side: schematicPort.side === "left" ? "right" : "left",
        text: label,
      } as AnyCircuitElement)
    }
  }

  return [
    ...circuitJson,
    ...generatedSourceNets,
    ...schematicComponents,
    ...schematicTexts,
    ...schematicPorts,
    ...schematicNetLabels,
  ]
}

function isLeftSideSchematicPort(portName: string): boolean {
  const normalizedPortName = portName.toUpperCase()
  return (
    normalizedPortName.includes("VDD") ||
    normalizedPortName.includes("VCC") ||
    normalizedPortName.includes("GND") ||
    normalizedPortName === "PIN1"
  )
}

function getPortY(
  centerY: number,
  portCount: number,
  portIndex: number,
): number {
  if (portCount <= 1) return centerY
  return centerY + ((portCount - 1) / 2 - portIndex) * 0.42
}

function getSourceTraceLabel(
  sourceTrace: AnyCircuitElement,
  sourceNetById: Map<string, { name?: string }>,
): string {
  if ("display_name" in sourceTrace && sourceTrace.display_name) {
    return String(sourceTrace.display_name)
  }

  if ("connected_source_net_ids" in sourceTrace) {
    const sourceNetId = sourceTrace.connected_source_net_ids?.[0]
    const sourceNetName = sourceNetId
      ? sourceNetById.get(sourceNetId)?.name
      : undefined
    if (sourceNetName) return sourceNetName
  }

  return ""
}

function getSchematicLabelSourceNetId(
  sourceTrace: AnyCircuitElement,
  label: string,
  sourceNetById: Map<string, { source_net_id: string; name?: string }>,
  generatedSourceNets: AnyCircuitElement[],
): string {
  if ("connected_source_net_ids" in sourceTrace) {
    const sourceNetId = sourceTrace.connected_source_net_ids?.[0]
    if (sourceNetId && sourceNetById.has(sourceNetId)) return sourceNetId
  }

  const sourceTraceId =
    "source_trace_id" in sourceTrace ? sourceTrace.source_trace_id : label
  const generatedSourceNetId = `source_net_for_${sourceTraceId}`
  if (!sourceNetById.has(generatedSourceNetId)) {
    const generatedSourceNet = {
      type: "source_net",
      source_net_id: generatedSourceNetId,
      name: label,
    } as const
    generatedSourceNets.push(generatedSourceNet as AnyCircuitElement)
    sourceNetById.set(generatedSourceNetId, generatedSourceNet)
  }

  return generatedSourceNetId
}
