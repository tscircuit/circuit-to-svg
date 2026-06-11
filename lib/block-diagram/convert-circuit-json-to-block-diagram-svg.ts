import type { AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"

interface Options {
  width?: number
  height?: number
}

interface SourceComponentLike {
  type: "source_component"
  source_component_id: string
  name?: string
  ftype?: string
  source_group_id?: string
  subcircuit_id?: string
}

interface SourcePortLike {
  type: "source_port"
  source_port_id: string
  source_component_id?: string
  name?: string
  subcircuit_id?: string
}

interface SourceTraceLike {
  type: "source_trace"
  source_trace_id: string
  connected_source_port_ids?: string[]
  connected_source_net_ids?: string[]
  display_name?: string
  subcircuit_id?: string
  subcircuit_connectivity_map_key?: string
}

interface SourceNetLike {
  type: "source_net"
  source_net_id: string
  name?: string
}

interface SourceGroupLike {
  type: "source_group"
  source_group_id: string
  subcircuit_id?: string
  is_subcircuit?: boolean
  name?: string
}

interface BlockDiagramBlock {
  id: string
  kind: "primary" | "support" | "rail"
  title: string
  subtitle?: string
  ports: Array<{ sourcePortId: string; name: string }>
  sourceComponentIds: string[]
  sourceNetIds: string[]
  sourceGroupId?: string
  subcircuitId?: string
  x: number
  y: number
  width: number
  height: number
}

interface BlockDiagramConnection {
  fromBlockId: string
  toBlockId: string
  fromSourcePortId?: string
  toSourcePortId?: string
  label: string
  sourceTraceId?: string
  sourceNetIds: string[]
  routeLaneOffset?: number
}

interface RoutedBlockDiagramConnection extends BlockDiagramConnection {
  routePoints: Array<{ x: number; y: number }>
  labelPosition?: { x: number; y: number }
  labelText?: string
  arrowTarget?: "block" | "label"
}

const POWER_NET_NAMES = new Set([
  "VCC",
  "VDD",
  "VBUS",
  "VIN",
  "VOUT",
  "VSYS",
  "3V3",
  "5V",
  "GND",
  "GROUND",
  "AGND",
  "DGND",
])

const INTERFACE_LABELS = new Map([
  ["SDA", "I2C SDA"],
  ["SCL", "I2C SCL"],
  ["MOSI", "SPI MOSI"],
  ["MISO", "SPI MISO"],
  ["SCK", "SPI SCK"],
  ["SCLK", "SPI SCK"],
  ["CLK", "SPI CLK"],
  ["CS", "SPI CS"],
  ["SS", "SPI CS"],
  ["TX", "UART TX"],
  ["RX", "UART RX"],
])

export function convertCircuitJsonToBlockDiagramSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  const width = options?.width ?? 900
  const height = options?.height ?? 520
  const graph = deriveBlockDiagramGraph(circuitJson, width, height)
  const routedConnections = createRoutedConnections(
    graph.connections,
    graph.blocks,
  )
  const diagramBounds = getBlockDiagramSvgBounds(
    graph.blocks,
    routedConnections,
    width,
    height,
  )

  const children: SvgObject[] = [
    {
      name: "style",
      type: "element",
      attributes: {},
      value: "",
      children: [
        {
          name: "",
          type: "text",
          attributes: {},
          value: `
            .block-diagram-background { fill: #fff; }
            .block-diagram-title { fill: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; }
            .block-diagram-subtitle { fill: #64748b; font-family: Arial, sans-serif; font-size: 11px; text-anchor: middle; dominant-baseline: middle; }
            .block-diagram-port-label { fill: #334155; font-family: Arial, sans-serif; font-size: 10px; dominant-baseline: middle; }
            .block-diagram-block { stroke: #334155; stroke-width: 1.5; rx: 6; ry: 6; }
            .block-diagram-primary { fill: #f8fafc; }
            .block-diagram-support { fill: #fff7ed; stroke-dasharray: 5 3; }
            .block-diagram-rail { fill: #eef6ff; }
            .block-diagram-connection { stroke: #1f2937; stroke-width: 1.6; fill: none; marker-end: url(#block-diagram-arrowhead); }
            .block-diagram-label-bg { fill: #fff; stroke: #cbd5e1; stroke-width: 1; rx: 4; ry: 4; }
            .block-diagram-label { fill: #0f172a; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; dominant-baseline: middle; }
          `,
          children: [],
        },
      ],
    },
    createArrowheadMarkerSvgObject(),
    rect({
      class: "block-diagram-background",
      x: diagramBounds.minX.toString(),
      y: diagramBounds.minY.toString(),
      width: diagramBounds.width.toString(),
      height: diagramBounds.height.toString(),
    }),
    ...routedConnections.map(createConnectionSvgObject),
    ...routedConnections.map((connection) =>
      createConnectionLabelSvgObject(connection, graph.blocks),
    ),
    ...graph.blocks.map(createBlockSvgObject),
  ]

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: diagramBounds.width.toString(),
      height: diagramBounds.height.toString(),
      viewBox: `${diagramBounds.minX} ${diagramBounds.minY} ${diagramBounds.width} ${diagramBounds.height}`,
    },
    value: "",
    children,
  }

  return stringify(svgObject)
}

function deriveBlockDiagramGraph(
  soup: AnyCircuitElement[],
  width: number,
  height: number,
): {
  blocks: BlockDiagramBlock[]
  connections: BlockDiagramConnection[]
} {
  const sourceComponents = soup.filter(isSourceComponent)
  const sourcePorts = soup.filter(isSourcePort)
  const sourceTraces = soup.filter(isSourceTrace)
  const sourceNets = soup.filter(isSourceNet)
  const sourceGroups = soup.filter(isSourceGroup)

  const portsById = new Map(
    sourcePorts.map((port) => [port.source_port_id, port]),
  )
  const sourceComponentById = new Map<string, SourceComponentLike>(
    sourceComponents.map((component) => [
      component.source_component_id,
      component,
    ]),
  )
  const netsById = new Map(sourceNets.map((net) => [net.source_net_id, net]))
  const portConnectionLabels = getPortConnectionLabels(
    sourceTraces,
    portsById,
    netsById,
  )
  const sourceGroupById = new Map(
    sourceGroups.map((group) => [group.source_group_id, group]),
  )
  const sourceGroupBySubcircuitId = new Map(
    sourceGroups
      .filter((group) => group.is_subcircuit && group.subcircuit_id)
      .map((group) => [group.subcircuit_id!, group]),
  )
  const portsByComponentId = new Map<string, SourcePortLike[]>()
  for (const port of sourcePorts) {
    if (!port.source_component_id) continue
    const ports = portsByComponentId.get(port.source_component_id) ?? []
    ports.push(port)
    portsByComponentId.set(port.source_component_id, ports)
  }

  const componentSubcircuitIds = new Map<string, string>()
  for (const component of sourceComponents) {
    const ports = portsByComponentId.get(component.source_component_id) ?? []
    const sourceGroupSubcircuitId = component.source_group_id
      ? sourceGroupById.get(component.source_group_id)?.subcircuit_id
      : undefined
    const subcircuitId =
      component.subcircuit_id ??
      sourceGroupSubcircuitId ??
      ports.find((port) => port.subcircuit_id)?.subcircuit_id

    if (subcircuitId) {
      componentSubcircuitIds.set(component.source_component_id, subcircuitId)
    }
  }

  const componentsBySubcircuitId = new Map<string, SourceComponentLike[]>()
  for (const component of sourceComponents) {
    const subcircuitId = componentSubcircuitIds.get(
      component.source_component_id,
    )
    if (!subcircuitId) continue

    const components = componentsBySubcircuitId.get(subcircuitId) ?? []
    components.push(component)
    componentsBySubcircuitId.set(subcircuitId, components)
  }

  const collapsibleSubcircuitIds = new Set(
    [...componentsBySubcircuitId.keys()].filter((subcircuitId) => {
      const sourceGroup = sourceGroupBySubcircuitId.get(subcircuitId)
      return componentsBySubcircuitId.size > 1 || Boolean(sourceGroup?.name)
    }),
  )
  const groupedComponentIds = new Set(
    [...componentsBySubcircuitId]
      .filter(([subcircuitId]) => collapsibleSubcircuitIds.has(subcircuitId))
      .flatMap(([, components]) => components)
      .map((component) => component.source_component_id),
  )

  const blocks: BlockDiagramBlock[] = []
  const blockByComponentId = new Map<string, BlockDiagramBlock>()
  const supportComponents = sourceComponents.filter(
    (component) =>
      !groupedComponentIds.has(component.source_component_id) &&
      !isPrimaryComponent(component),
  )
  const hasSupportColumn = supportComponents.length > 0
  const primaryBlockWidth = 240
  const supportBlockWidth = 170
  const componentColumnGap = 170
  const primaryX = hasSupportColumn
    ? Math.max(330, width * 0.44 - primaryBlockWidth / 2)
    : Math.max(360, width * 0.55 - primaryBlockWidth / 2)
  const supportX = Math.min(
    width - supportBlockWidth - 40,
    primaryX + primaryBlockWidth + componentColumnGap,
  )

  const primaryBlockSpecs: Array<{
    id: string
    title: string
    subtitle?: string
    ports: Array<{ sourcePortId: string; name: string }>
    sourceComponentIds: string[]
    sourceGroupId?: string
    subcircuitId?: string
  }> = []

  for (const [subcircuitId, components] of componentsBySubcircuitId) {
    if (!collapsibleSubcircuitIds.has(subcircuitId)) continue

    const sourceGroup = sourceGroupBySubcircuitId.get(subcircuitId)
    const sourceComponentIds = components.map(
      (component) => component.source_component_id,
    )

    primaryBlockSpecs.push({
      id: `subcircuit:${subcircuitId}`,
      title: sourceGroup?.name ?? readableId(subcircuitId),
      subtitle: sourceComponentIds
        .map(
          (sourceComponentId) =>
            sourceComponents.find(
              (component) =>
                component.source_component_id === sourceComponentId,
            )?.name ?? sourceComponentId,
        )
        .join(", "),
      ports: getBlockPortsForComponents(components, portsByComponentId, {
        includeComponentName: true,
        portConnectionLabels,
      }),
      sourceComponentIds,
      sourceGroupId: sourceGroup?.source_group_id,
      subcircuitId,
    })
  }

  for (const component of sourceComponents.filter(
    (component) =>
      !groupedComponentIds.has(component.source_component_id) &&
      isPrimaryComponent(component),
  )) {
    primaryBlockSpecs.push({
      id: `component:${component.source_component_id}`,
      title: component.name ?? component.source_component_id,
      subtitle: component.ftype,
      ports: getBlockPorts(component, portsByComponentId, portConnectionLabels),
      sourceComponentIds: [component.source_component_id],
    })
  }

  const primaryBlockHeights = primaryBlockSpecs.map((spec) =>
    getComponentBlockHeight(spec.ports.length, true),
  )

  for (const [index, spec] of primaryBlockSpecs.entries()) {
    const blockHeight =
      primaryBlockHeights[index] ??
      getComponentBlockHeight(spec.ports.length, true)
    const block: BlockDiagramBlock = {
      id: spec.id,
      kind: "primary",
      title: spec.title,
      subtitle: spec.subtitle,
      ports: spec.ports,
      sourceComponentIds: spec.sourceComponentIds,
      sourceNetIds: [],
      sourceGroupId: spec.sourceGroupId,
      subcircuitId: spec.subcircuitId,
      x: primaryX,
      y: getStackedBlockY(index, primaryBlockHeights, height),
      width: primaryBlockWidth,
      height: blockHeight,
    }
    blocks.push(block)
    for (const sourceComponentId of spec.sourceComponentIds) {
      blockByComponentId.set(sourceComponentId, block)
    }
  }

  const supportHeights = supportComponents.map((component) =>
    getComponentBlockHeight(
      getBlockPorts(component, portsByComponentId, portConnectionLabels).length,
    ),
  )

  for (const [index, component] of supportComponents.entries()) {
    const ports = getBlockPorts(
      component,
      portsByComponentId,
      portConnectionLabels,
    )
    const blockHeight =
      supportHeights[index] ?? getComponentBlockHeight(ports.length)
    const block: BlockDiagramBlock = {
      id: `component:${component.source_component_id}`,
      kind: "support",
      title: component.name ?? component.source_component_id,
      subtitle: component.ftype,
      ports,
      sourceComponentIds: [component.source_component_id],
      sourceNetIds: [],
      x: supportX,
      y: getStackedBlockY(index, supportHeights, height),
      width: supportBlockWidth,
      height: blockHeight,
    }
    blocks.push(block)
    blockByComponentId.set(component.source_component_id, block)
  }

  const railBlocksByName = new Map<string, BlockDiagramBlock>()

  function getRailBlock(
    name: string,
    sourceNetIds: string[],
  ): BlockDiagramBlock {
    const normalizedName = normalizeNetName(name)
    const existingBlock = railBlocksByName.get(normalizedName)
    if (existingBlock) {
      existingBlock.sourceNetIds = unique([
        ...existingBlock.sourceNetIds,
        ...sourceNetIds,
      ])
      return existingBlock
    }

    const railIndex = railBlocksByName.size
    const railBlock: BlockDiagramBlock = {
      id: `rail:${normalizedName}`,
      kind: "rail",
      title: normalizedName,
      subtitle: "Power Rail",
      ports: [],
      sourceComponentIds: [],
      sourceNetIds,
      x: 40,
      y: 55 + railIndex * 95,
      width: 120,
      height: 58,
    }
    railBlocksByName.set(normalizedName, railBlock)
    blocks.push(railBlock)
    return railBlock
  }

  const connectionMap = new Map<string, BlockDiagramConnection>()

  for (const trace of sourceTraces) {
    const connectedPorts: SourcePortLike[] = []
    for (const portId of trace.connected_source_port_ids ?? []) {
      const port = portsById.get(portId)
      if (port) connectedPorts.push(port)
    }

    const connectedComponentPorts = connectedPorts
      .map((port) => {
        if (!port.source_component_id) return undefined
        const component = sourceComponentById.get(port.source_component_id)
        if (!component) return undefined
        const block = blockByComponentId.get(port.source_component_id)
        if (!block) return undefined
        return { block, component, port }
      })
      .filter(
        (
          item,
        ): item is {
          block: BlockDiagramBlock
          component: SourceComponentLike
          port: SourcePortLike
        } => Boolean(item),
      )

    const sourceNetIds = trace.connected_source_net_ids ?? []
    const names = getCandidateNetNames(
      trace,
      connectedPorts,
      sourceNetIds,
      netsById,
    )
    const powerName = names.find(isPowerNetName)
    const interfaceLabel = inferInterfaceLabel(names)
    const label = interfaceLabel ?? powerName ?? names[0] ?? "connection"

    const targetBlocks: BlockDiagramBlock[] = []

    if (powerName) {
      targetBlocks.push(getRailBlock(powerName, sourceNetIds))
    }

    if (!powerName && connectedComponentPorts.length > 1) {
      for (let i = 0; i < connectedComponentPorts.length - 1; i++) {
        const from = connectedComponentPorts[i]
        const to = connectedComponentPorts[i + 1]
        if (from && to) {
          if (from.block.id === to.block.id) continue
          addConnection(connectionMap, {
            fromBlockId: from.block.id,
            toBlockId: to.block.id,
            fromSourcePortId: from.port.source_port_id,
            toSourcePortId: to.port.source_port_id,
            label,
            sourceTraceId: trace.source_trace_id,
            sourceNetIds,
          })
        }
      }
    }

    const powerDriver = powerName
      ? connectedComponentPorts.find(({ component, port }) =>
          isPowerOutputPort(component, port, powerName),
        )
      : undefined

    if (powerDriver) {
      for (const targetBlock of targetBlocks) {
        if (powerDriver.block.id === targetBlock.id) continue
        addConnection(connectionMap, {
          fromBlockId: powerDriver.block.id,
          toBlockId: targetBlock.id,
          fromSourcePortId: powerDriver.port.source_port_id,
          label,
          sourceTraceId: trace.source_trace_id,
          sourceNetIds,
        })
      }
    }

    for (const { block: componentBlock, port } of connectedComponentPorts) {
      for (const targetBlock of targetBlocks) {
        if (componentBlock.id === targetBlock.id) continue
        if (powerDriver?.block.id === componentBlock.id) continue
        addConnection(connectionMap, {
          fromBlockId: targetBlock.id,
          toBlockId: componentBlock.id,
          toSourcePortId: port.source_port_id,
          label,
          sourceTraceId: trace.source_trace_id,
          sourceNetIds,
        })
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      id: "empty",
      kind: "primary",
      title: "Circuit",
      subtitle: "No source components",
      ports: [],
      sourceComponentIds: [],
      sourceNetIds: [],
      x: width / 2 - 95,
      y: height / 2 - 40,
      width: 190,
      height: 80,
    })
  }
  centerRailBlocks(blocks, height)

  return {
    blocks,
    connections: [...connectionMap.values()],
  }
}

function centerRailBlocks(blocks: BlockDiagramBlock[], svgHeight: number) {
  const railBlocks = blocks.filter((block) => block.kind === "rail")
  if (railBlocks.length === 0) return

  const railGap = 54
  const totalRailHeight =
    railBlocks.reduce((sum, block) => sum + block.height, 0) +
    railGap * Math.max(0, railBlocks.length - 1)
  let y = Math.max(40, svgHeight / 2 - totalRailHeight / 2)

  for (const block of railBlocks) {
    block.y = y
    y += block.height + railGap
  }
}

function createBlockSvgObject(block: BlockDiagramBlock): SvgObject {
  const hasPorts = block.ports.length > 0
  const titleY = hasPorts
    ? block.y + 18
    : block.y + block.height / 2 - (block.subtitle ? 10 : 0)
  const subtitleY = hasPorts ? block.y + 36 : block.y + block.height / 2 + 14

  const portObjects = block.ports.flatMap((port, index) => {
    const leftColumn = index < Math.ceil(block.ports.length / 2)
    const columnIndex = leftColumn
      ? index
      : index - Math.ceil(block.ports.length / 2)
    const y = block.y + 58 + columnIndex * 15
    const labelX = leftColumn ? block.x + 14 : block.x + block.width - 14

    return [
      text(
        {
          class: "block-diagram-port-label",
          "data-source-port-id": port.sourcePortId,
          x: labelX.toString(),
          y: y.toString(),
          "text-anchor": leftColumn ? "start" : "end",
        },
        port.name,
      ),
    ]
  })

  return group(
    {
      class: `block-diagram-block-group block-diagram-${block.kind}`,
      "data-block-id": block.id,
      ...(block.sourceComponentIds.length > 0 && {
        "data-source-component-ids": block.sourceComponentIds.join(" "),
      }),
      ...(block.sourceNetIds.length > 0 && {
        "data-source-net-ids": block.sourceNetIds.join(" "),
      }),
      ...(block.sourceGroupId && {
        "data-source-group-id": block.sourceGroupId,
      }),
      ...(block.subcircuitId && {
        "data-subcircuit-id": block.subcircuitId,
      }),
    },
    [
      rect({
        class: `block-diagram-block block-diagram-${block.kind}`,
        x: block.x.toString(),
        y: block.y.toString(),
        width: block.width.toString(),
        height: block.height.toString(),
      }),
      text(
        {
          class: "block-diagram-title",
          x: (block.x + block.width / 2).toString(),
          y: titleY.toString(),
        },
        block.title,
      ),
      ...(block.subtitle
        ? [
            text(
              {
                class: "block-diagram-subtitle",
                x: (block.x + block.width / 2).toString(),
                y: subtitleY.toString(),
              },
              block.subtitle,
            ),
          ]
        : []),
      ...portObjects,
    ],
  )
}

function getBlockPorts(
  component: SourceComponentLike,
  portsByComponentId: Map<string, SourcePortLike[]>,
  portConnectionLabels: Map<string, string>,
): Array<{ sourcePortId: string; name: string }> {
  return (portsByComponentId.get(component.source_component_id) ?? []).map(
    (port) => ({
      sourcePortId: port.source_port_id,
      name: getPortDiagramLabel(port, portConnectionLabels),
    }),
  )
}

function getBlockPortsForComponents(
  components: SourceComponentLike[],
  portsByComponentId: Map<string, SourcePortLike[]>,
  options?: {
    includeComponentName?: boolean
    portConnectionLabels?: Map<string, string>
  },
): Array<{ sourcePortId: string; name: string }> {
  return components.flatMap((component) => {
    const componentName = component.name ?? component.source_component_id

    return (portsByComponentId.get(component.source_component_id) ?? []).map(
      (port) => {
        const portName = getPortDiagramLabel(
          port,
          options?.portConnectionLabels ?? new Map(),
        )
        return {
          sourcePortId: port.source_port_id,
          name: options?.includeComponentName
            ? `${componentName}.${portName}`
            : portName,
        }
      },
    )
  })
}

function getPortConnectionLabels(
  sourceTraces: SourceTraceLike[],
  portsById: Map<string, SourcePortLike>,
  netsById: Map<string, SourceNetLike>,
): Map<string, string> {
  const portConnectionLabels = new Map<string, string>()

  for (const trace of sourceTraces) {
    const connectedPorts = (trace.connected_source_port_ids ?? [])
      .map((portId) => portsById.get(portId))
      .filter((port): port is SourcePortLike => Boolean(port))
    const sourceNetIds = trace.connected_source_net_ids ?? []
    const names = getCandidateNetNames(
      trace,
      connectedPorts,
      sourceNetIds,
      netsById,
    )
    const label =
      names.find(isPowerNetName) ?? inferInterfaceLabel(names) ?? names[0]
    if (!label) continue

    for (const port of connectedPorts) {
      portConnectionLabels.set(port.source_port_id, label)
    }
  }

  return portConnectionLabels
}

function getPortDiagramLabel(
  port: SourcePortLike,
  portConnectionLabels: Map<string, string>,
): string {
  const portName = port.name ?? port.source_port_id
  const connectionLabel = portConnectionLabels.get(port.source_port_id)
  if (!connectionLabel) return portName
  if (normalizeNetName(connectionLabel) === normalizeNetName(portName)) {
    return portName
  }

  return `${portName} (${connectionLabel})`
}

function getComponentBlockHeight(portCount: number, isPrimary = false): number {
  const portRows = Math.ceil(portCount / 2)
  return Math.max(isPrimary ? 140 : 92, 78 + portRows * 15)
}

function getStackedBlockY(
  index: number,
  blockHeights: number[],
  svgHeight: number,
): number {
  const gap = 96
  const totalHeight =
    blockHeights.reduce((sum, blockHeight) => sum + blockHeight, 0) +
    gap * Math.max(0, blockHeights.length - 1)
  const startY = Math.max(40, svgHeight / 2 - totalHeight / 2)

  return (
    startY +
    blockHeights
      .slice(0, index)
      .reduce((sum, blockHeight) => sum + blockHeight, 0) +
    gap * index
  )
}

function createConnectionSvgObject(
  connection: RoutedBlockDiagramConnection,
): SvgObject {
  const [from, to] = connection.routePoints
  if (!from || !to) return group({}, [])

  const labelText = connection.labelText ?? connection.label
  const labelWidth = Math.max(50, labelText.length * 7 + 16)
  const d =
    connection.arrowTarget === "label" && connection.routePoints.length > 2
      ? getOverviewPolylinePathD(connection.routePoints)
      : connection.arrowTarget === "label"
        ? getOverviewArrowToLabelPathD(
            from,
            connection.labelPosition,
            labelWidth,
          )
        : getOverviewArrowPathD(from, to, connection.labelPosition, labelWidth)
  const connectionAttributes = {
    ...(connection.sourceTraceId && {
      "data-source-trace-id": connection.sourceTraceId,
    }),
    ...(connection.sourceNetIds.length > 0 && {
      "data-source-net-ids": connection.sourceNetIds.join(" "),
    }),
  }

  return group(
    {
      class: "block-diagram-connection-group",
      ...connectionAttributes,
    },
    d
      ? [
          path({
            class: "block-diagram-connection",
            d,
          }),
        ]
      : [],
  )
}

function createArrowheadMarkerSvgObject(): SvgObject {
  return {
    name: "defs",
    type: "element",
    attributes: {},
    value: "",
    children: [
      {
        name: "marker",
        type: "element",
        attributes: {
          id: "block-diagram-arrowhead",
          markerWidth: "9",
          markerHeight: "7",
          refX: "8",
          refY: "3.5",
          orient: "auto",
          markerUnits: "strokeWidth",
        },
        value: "",
        children: [
          path({
            d: "M 0 0 L 9 3.5 L 0 7 Z",
            fill: "#1f2937",
          }),
        ],
      },
    ],
  }
}

function getOverviewPolylinePathD(points: Array<{ x: number; y: number }>) {
  const [firstPoint, secondPoint] = points
  if (!firstPoint || !secondPoint) return ""

  const firstSegmentLength = getPointDistance(firstPoint, secondPoint)
  if (firstSegmentLength < 1) return ""

  const start = movePoint(
    firstPoint,
    {
      x: (secondPoint.x - firstPoint.x) / firstSegmentLength,
      y: (secondPoint.y - firstPoint.y) / firstSegmentLength,
    },
    18,
  )
  const pathPoints = [start, ...points.slice(1)]

  return pathPoints
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ")
}

function getOverviewArrowPathD(
  from: { x: number; y: number },
  to: { x: number; y: number },
  labelPosition: { x: number; y: number } | undefined,
  labelWidth: number,
): string {
  return getOverviewArrowSegments(from, to, labelPosition, labelWidth)
    .map(
      (segment) =>
        `M ${segment.from.x} ${segment.from.y} L ${segment.to.x} ${segment.to.y}`,
    )
    .join(" ")
}

function getOverviewArrowToLabelPathD(
  from: { x: number; y: number },
  labelPosition: { x: number; y: number } | undefined,
  labelWidth: number,
): string {
  if (!labelPosition) return ""

  const totalLength = getPointDistance(from, labelPosition)
  if (totalLength < 1) return ""

  const unit = {
    x: (labelPosition.x - from.x) / totalLength,
    y: (labelPosition.y - from.y) / totalLength,
  }
  const start = movePoint(from, unit, 18)
  const labelSpan =
    Math.abs(unit.x) >= Math.abs(unit.y) ? labelWidth / 2 + 2 : 19
  const end = movePoint(labelPosition, unit, -labelSpan)

  if (getPointDistance(start, end) < 18) return ""

  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

function getOverviewArrowSegments(
  from: { x: number; y: number },
  to: { x: number; y: number },
  labelPosition: { x: number; y: number } | undefined,
  labelWidth: number,
): Array<{
  from: { x: number; y: number }
  to: { x: number; y: number }
}> {
  const totalLength = getPointDistance(from, to)
  if (totalLength < 1) return []

  const blockGap = 18
  const labelGap = 8
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
  const labelSpan = horizontal ? labelWidth : 22
  const unit = {
    x: (to.x - from.x) / totalLength,
    y: (to.y - from.y) / totalLength,
  }
  const start = movePoint(from, unit, blockGap)
  const end = movePoint(to, unit, -blockGap)
  const usableLength = getPointDistance(start, end)
  if (usableLength <= 10) return []

  if (!labelPosition) {
    return [{ from: start, to: end }]
  }

  const labelCenterDistance =
    (labelPosition.x - from.x) * unit.x + (labelPosition.y - from.y) * unit.y
  const labelHalfWidth = labelSpan / 2
  const labelStartDistance = Math.max(
    blockGap,
    labelCenterDistance - labelHalfWidth - labelGap,
  )
  const labelEndDistance = Math.min(
    totalLength - blockGap,
    labelCenterDistance + labelHalfWidth + labelGap,
  )
  const labelStart = movePoint(from, unit, labelStartDistance)
  const labelEnd = movePoint(from, unit, labelEndDistance)
  const segments: Array<{
    from: { x: number; y: number }
    to: { x: number; y: number }
  }> = []

  if (getPointDistance(start, labelStart) >= 22) {
    segments.push({ from: start, to: labelStart })
  }
  if (getPointDistance(labelEnd, end) >= 22) {
    segments.push({ from: labelEnd, to: end })
  }

  return segments.length > 0 ? segments : [{ from: start, to: end }]
}

function movePoint(
  point: { x: number; y: number },
  unit: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  return {
    x: point.x + unit.x * distance,
    y: point.y + unit.y * distance,
  }
}

function getPointDistance(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

function createConnectionLabelSvgObject(
  connection: RoutedBlockDiagramConnection,
  blocks: BlockDiagramBlock[],
): SvgObject {
  if (!connection.labelPosition) return group({}, [])

  const fromBlock = blocks.find((block) => block.id === connection.fromBlockId)
  const toBlock = blocks.find((block) => block.id === connection.toBlockId)
  if (!fromBlock || !toBlock) return group({}, [])

  const labelText = connection.labelText ?? connection.label
  const labelWidth = Math.max(50, labelText.length * 7 + 16)
  const labelHeight = 22

  return group(
    {
      class: "block-diagram-connection-label-group",
      ...(connection.sourceTraceId && {
        "data-source-trace-id": connection.sourceTraceId,
      }),
      ...(connection.sourceNetIds.length > 0 && {
        "data-source-net-ids": connection.sourceNetIds.join(" "),
      }),
    },
    [
      rect({
        class: "block-diagram-label-bg",
        x: (connection.labelPosition.x - labelWidth / 2).toString(),
        y: (connection.labelPosition.y - labelHeight / 2).toString(),
        width: labelWidth.toString(),
        height: labelHeight.toString(),
      }),
      text(
        {
          class: "block-diagram-label",
          x: connection.labelPosition.x.toString(),
          y: connection.labelPosition.y.toString(),
        },
        labelText,
      ),
    ],
  )
}

function getBlockDiagramSvgBounds(
  blocks: BlockDiagramBlock[],
  routedConnections: RoutedBlockDiagramConnection[],
  requestedWidth: number,
  requestedHeight: number,
): { minX: number; minY: number; width: number; height: number } {
  const padding = 28
  const points: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: requestedWidth, y: requestedHeight },
  ]

  for (const block of blocks) {
    points.push(
      { x: block.x, y: block.y },
      { x: block.x + block.width, y: block.y + block.height },
    )
  }

  for (const connection of routedConnections) {
    points.push(...connection.routePoints)

    if (connection.labelPosition) {
      const labelText = connection.labelText ?? connection.label
      const labelWidth = Math.max(50, labelText.length * 7 + 16)
      const labelHeight = 22
      points.push(
        {
          x: connection.labelPosition.x - labelWidth / 2,
          y: connection.labelPosition.y - labelHeight / 2,
        },
        {
          x: connection.labelPosition.x + labelWidth / 2,
          y: connection.labelPosition.y + labelHeight / 2,
        },
      )
    }
  }

  const minX = Math.floor(Math.min(...points.map((point) => point.x)) - padding)
  const minY = Math.floor(Math.min(...points.map((point) => point.y)) - padding)
  const maxX = Math.ceil(Math.max(...points.map((point) => point.x)) + padding)
  const maxY = Math.ceil(Math.max(...points.map((point) => point.y)) + padding)

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function createRoutedConnections(
  connections: BlockDiagramConnection[],
  blocks: BlockDiagramBlock[],
): RoutedBlockDiagramConnection[] {
  const routedConnections: RoutedBlockDiagramConnection[] = []
  const laneOffsets = getParallelRouteLaneOffsets(connections, blocks)
  const labelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }> = []

  for (const connection of connections) {
    const fromBlock = blocks.find(
      (block) => block.id === connection.fromBlockId,
    )
    const toBlock = blocks.find((block) => block.id === connection.toBlockId)
    if (!fromBlock || !toBlock) continue
    const connectionWithLane = {
      ...connection,
      routeLaneOffset: laneOffsets.get(connection) ?? 0,
    }
    const routePoints = getOverviewArrowPoints(
      fromBlock,
      toBlock,
      connectionWithLane,
    )
    let arrowTarget: "block" | "label" = shouldPointToLabel(
      routePoints,
      fromBlock,
      toBlock,
      blocks,
    )
      ? "label"
      : "block"
    let labelText = arrowTarget === "label" ? toBlock.title : connection.label
    const labelWidth = Math.max(50, labelText.length * 7 + 16)
    const labelHeight = 22
    const elbowRoute =
      arrowTarget === "label" && isHorizontalRoute(routePoints)
        ? getElbowLabelRoute(
            fromBlock,
            toBlock,
            connectionWithLane.routeLaneOffset ?? 0,
            labelWidth,
            labelHeight,
            labelRects,
            blocks,
          )
        : undefined
    const finalRoutePoints = elbowRoute?.routePoints ?? routePoints
    const labelPosition =
      elbowRoute?.labelPosition ??
      getOverviewArrowLabelPosition(
        routePoints,
        connectionWithLane.routeLaneOffset ?? 0,
        labelWidth,
        labelHeight,
        labelRects,
        arrowTarget,
      )

    if (elbowRoute) {
      arrowTarget = "label"
      labelText = toBlock.title
    }

    labelRects.push({
      x: labelPosition.x - labelWidth / 2,
      y: labelPosition.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    })

    routedConnections.push({
      ...connectionWithLane,
      routePoints: finalRoutePoints,
      labelPosition,
      labelText,
      arrowTarget,
    })
  }

  return routedConnections
}

function isHorizontalRoute(points: Array<{ x: number; y: number }>): boolean {
  const [from, to] = points
  if (!from || !to) return false
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
}

function getElbowLabelRoute(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  laneOffset: number,
  labelWidth: number,
  labelHeight: number,
  occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }>,
  blocks: BlockDiagramBlock[],
): {
  routePoints: Array<{ x: number; y: number }>
  labelPosition: { x: number; y: number }
} {
  const fromCenter = getBlockCenter(fromBlock)
  const toCenter = getBlockCenter(toBlock)
  const destinationIsRight = toCenter.x >= fromCenter.x
  const laneSpacing = 64 + Math.abs(laneOffset) * 0.25
  const routeCandidates = getCompactElbowRouteYs(
    fromBlock,
    toBlock,
    laneSpacing,
    blocks,
  ).map((routeY) =>
    getElbowLabelRouteCandidate({
      fromBlock,
      toBlock,
      routeY,
      destinationIsRight,
      labelWidth,
      labelHeight,
      occupiedLabelRects,
      blocks,
    }),
  )
  const preferredRouteAbove =
    toCenter.y < fromCenter.y ||
    (Math.abs(toCenter.y - fromCenter.y) < 1 && laneOffset <= 0)

  return routeCandidates.sort((a, b) => {
    if (a.blockIntersections !== b.blockIntersections) {
      return a.blockIntersections - b.blockIntersections
    }
    if (a.crowdingScore !== b.crowdingScore) {
      return a.crowdingScore - b.crowdingScore
    }
    if (a.routeAbove !== b.routeAbove) {
      if (a.routeAbove === preferredRouteAbove) return -1
      if (b.routeAbove === preferredRouteAbove) return 1
    }
    return a.routeLength - b.routeLength
  })[0]!
}

function getCompactElbowRouteYs(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  laneSpacing: number,
  blocks: BlockDiagramBlock[],
): number[] {
  const yCandidates = [
    Math.min(fromBlock.y, toBlock.y) - laneSpacing,
    Math.min(fromBlock.y, toBlock.y) - laneSpacing * 1.65,
    Math.max(fromBlock.y + fromBlock.height, toBlock.y + toBlock.height) +
      laneSpacing,
    Math.max(fromBlock.y + fromBlock.height, toBlock.y + toBlock.height) +
      laneSpacing * 1.65,
    fromBlock.y - laneSpacing,
    fromBlock.y - laneSpacing * 1.65,
    fromBlock.y + fromBlock.height + laneSpacing,
    fromBlock.y + fromBlock.height + laneSpacing * 1.65,
    toBlock.y - laneSpacing,
    toBlock.y - laneSpacing * 1.65,
    toBlock.y + toBlock.height + laneSpacing,
    toBlock.y + toBlock.height + laneSpacing * 1.65,
    Math.min(...blocks.map((block) => block.y)) - laneSpacing,
    Math.min(...blocks.map((block) => block.y)) - laneSpacing * 1.65,
    Math.max(...blocks.map((block) => block.y + block.height)) + laneSpacing,
    Math.max(...blocks.map((block) => block.y + block.height)) +
      laneSpacing * 1.65,
  ]

  return unique(yCandidates.map((y) => Math.round(y * 100) / 100))
}

function getElbowLabelRouteCandidate({
  fromBlock,
  toBlock,
  routeY,
  destinationIsRight,
  labelWidth,
  labelHeight,
  occupiedLabelRects,
  blocks,
}: {
  fromBlock: BlockDiagramBlock
  toBlock: BlockDiagramBlock
  routeY: number
  destinationIsRight: boolean
  labelWidth: number
  labelHeight: number
  occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
  blocks: BlockDiagramBlock[]
}): {
  routeAbove: boolean
  routePoints: Array<{ x: number; y: number }>
  labelPosition: { x: number; y: number }
  blockIntersections: number
  crowdingScore: number
  routeLength: number
} {
  const fromCenter = getBlockCenter(fromBlock)
  const routeAbove = routeY < fromCenter.y
  const fromPoint = {
    x: fromCenter.x,
    y: routeAbove ? fromBlock.y : fromBlock.y + fromBlock.height,
  }
  const minimumTurnDistance = 58
  const adjustedRouteY = routeAbove
    ? Math.min(routeY, fromPoint.y - minimumTurnDistance)
    : Math.max(routeY, fromPoint.y + minimumTurnDistance)
  const elbowLeadPoint = {
    x: fromPoint.x,
    y: fromPoint.y + (routeAbove ? -34 : 34),
  }
  const preferredLabelX = destinationIsRight
    ? fromPoint.x + labelWidth / 2 + 92
    : fromPoint.x - labelWidth / 2 - 92
  const labelPosition = getClearLabelPosition(
    { x: preferredLabelX, y: adjustedRouteY },
    labelWidth,
    labelHeight,
    occupiedLabelRects,
    destinationIsRight ? 1 : -1,
  )
  const labelEdgeX = destinationIsRight
    ? labelPosition.x - labelWidth / 2 - 2
    : labelPosition.x + labelWidth / 2 + 2
  const routePoints = [
    fromPoint,
    elbowLeadPoint,
    { x: elbowLeadPoint.x, y: adjustedRouteY },
    { x: labelEdgeX, y: adjustedRouteY },
  ]

  return {
    routeAbove,
    routePoints,
    labelPosition,
    blockIntersections: countRouteBlockIntersections(
      routePoints,
      blocks.filter((block) => block !== fromBlock),
      16,
    ),
    crowdingScore: getRouteCrowdingScore({
      routePoints,
      labelPosition,
      labelWidth,
      labelHeight,
      blocks: blocks.filter((block) => block !== fromBlock),
      occupiedLabelRects,
    }),
    routeLength: getPolylineLength(routePoints),
  }
}

function getPolylineLength(points: Array<{ x: number; y: number }>): number {
  let length = 0

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]
    const to = points[i + 1]
    if (!from || !to) continue
    length += getPointDistance(from, to)
  }

  return length
}

function countRouteBlockIntersections(
  routePoints: Array<{ x: number; y: number }>,
  blocks: BlockDiagramBlock[],
  padding: number,
): number {
  let intersections = 0

  for (let i = 0; i < routePoints.length - 1; i++) {
    const from = routePoints[i]
    const to = routePoints[i + 1]
    if (!from || !to) continue

    intersections += blocks.filter((block) =>
      segmentIntersectsBlock(from, to, block, padding),
    ).length
  }

  return intersections
}

function getRouteCrowdingScore({
  routePoints,
  labelPosition,
  labelWidth,
  labelHeight,
  blocks,
  occupiedLabelRects,
}: {
  routePoints: Array<{ x: number; y: number }>
  labelPosition: { x: number; y: number }
  labelWidth: number
  labelHeight: number
  blocks: BlockDiagramBlock[]
  occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
}): number {
  const labelRect = {
    x: labelPosition.x - labelWidth / 2,
    y: labelPosition.y - labelHeight / 2,
    width: labelWidth,
    height: labelHeight,
  }
  let score = countRouteBlockIntersections(routePoints, blocks, 28) * 10

  score += blocks.filter((block) =>
    rectsOverlap(labelRect, {
      x: block.x - 10,
      y: block.y - 10,
      width: block.width + 20,
      height: block.height + 20,
    }),
  ).length
  score +=
    occupiedLabelRects.filter((rect) => rectsOverlap(labelRect, rect)).length *
    4

  return score
}

function getClearLabelPosition(
  preferredPosition: { x: number; y: number },
  labelWidth: number,
  labelHeight: number,
  occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }>,
  horizontalDirection: -1 | 1,
): { x: number; y: number } {
  const offsets = [0, 34, -34, 68, -68, 102, -102]

  for (const offset of offsets) {
    const candidate = {
      x: preferredPosition.x + offset * horizontalDirection,
      y: preferredPosition.y,
    }
    const candidateRect = {
      x: candidate.x - labelWidth / 2,
      y: candidate.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    }

    if (!occupiedLabelRects.some((rect) => rectsOverlap(candidateRect, rect))) {
      return candidate
    }
  }

  return {
    x: preferredPosition.x + 136 * horizontalDirection,
    y: preferredPosition.y,
  }
}

function getOverviewArrowPoints(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  connection: BlockDiagramConnection,
): Array<{ x: number; y: number }> {
  const fromCenter = getBlockCenter(fromBlock)
  const toCenter = getBlockCenter(toBlock)
  const horizontal =
    Math.abs(toCenter.x - fromCenter.x) >= Math.abs(toCenter.y - fromCenter.y)
  const laneOffset = connection.routeLaneOffset ?? 0

  if (horizontal) {
    const fromIsLeft = fromCenter.x <= toCenter.x
    const y = getSharedSideLanePosition(
      {
        min: fromBlock.y,
        max: fromBlock.y + fromBlock.height,
      },
      {
        min: toBlock.y,
        max: toBlock.y + toBlock.height,
      },
      fromCenter.y + (toCenter.y - fromCenter.y) / 2,
      laneOffset,
    )
    return [
      {
        x: fromIsLeft ? fromBlock.x + fromBlock.width : fromBlock.x,
        y,
      },
      {
        x: fromIsLeft ? toBlock.x : toBlock.x + toBlock.width,
        y,
      },
    ]
  }

  const fromIsAbove = fromCenter.y <= toCenter.y
  const x = getSharedSideLanePosition(
    {
      min: fromBlock.x,
      max: fromBlock.x + fromBlock.width,
    },
    {
      min: toBlock.x,
      max: toBlock.x + toBlock.width,
    },
    fromCenter.x + (toCenter.x - fromCenter.x) / 2,
    laneOffset,
  )
  return [
    {
      x,
      y: fromIsAbove ? fromBlock.y + fromBlock.height : fromBlock.y,
    },
    {
      x,
      y: fromIsAbove ? toBlock.y : toBlock.y + toBlock.height,
    },
  ]
}

function getSharedSideLanePosition(
  fromSpan: { min: number; max: number },
  toSpan: { min: number; max: number },
  fallbackPosition: number,
  laneOffset: number,
): number {
  const sidePadding = 18
  const overlapMin = Math.max(fromSpan.min, toSpan.min) + sidePadding
  const overlapMax = Math.min(fromSpan.max, toSpan.max) - sidePadding
  const unclampedPosition =
    overlapMin <= overlapMax
      ? overlapMin + (overlapMax - overlapMin) / 2 + laneOffset
      : fallbackPosition + laneOffset

  return overlapMin <= overlapMax
    ? clamp(unclampedPosition, overlapMin, overlapMax)
    : unclampedPosition
}

function shouldPointToLabel(
  points: Array<{ x: number; y: number }>,
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  blocks: BlockDiagramBlock[],
): boolean {
  const [from, to] = points
  if (!from || !to) return false

  const routeLength = getPointDistance(from, to)
  if (routeLength > 360) return true
  if (!routeEndpointsAreOnBlockSides(from, to, fromBlock, toBlock)) return true

  return blocks
    .filter((block) => block !== fromBlock && block !== toBlock)
    .some((block) => segmentIntersectsBlock(from, to, block, 10))
}

function routeEndpointsAreOnBlockSides(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
): boolean {
  const tolerance = 0.001

  if (Math.abs(from.y - to.y) < tolerance) {
    return (
      pointYIsInsideBlock(from.y, fromBlock) &&
      pointYIsInsideBlock(to.y, toBlock)
    )
  }

  if (Math.abs(from.x - to.x) < tolerance) {
    return (
      pointXIsInsideBlock(from.x, fromBlock) &&
      pointXIsInsideBlock(to.x, toBlock)
    )
  }

  return false
}

function pointYIsInsideBlock(y: number, block: BlockDiagramBlock): boolean {
  return y >= block.y && y <= block.y + block.height
}

function pointXIsInsideBlock(x: number, block: BlockDiagramBlock): boolean {
  return x >= block.x && x <= block.x + block.width
}

function segmentIntersectsBlock(
  from: { x: number; y: number },
  to: { x: number; y: number },
  block: BlockDiagramBlock,
  padding: number,
): boolean {
  const rect = {
    x: block.x - padding,
    y: block.y - padding,
    width: block.width + padding * 2,
    height: block.height + padding * 2,
  }

  if (Math.abs(from.y - to.y) < 0.001) {
    const minX = Math.min(from.x, to.x)
    const maxX = Math.max(from.x, to.x)
    return (
      from.y >= rect.y &&
      from.y <= rect.y + rect.height &&
      maxX >= rect.x &&
      minX <= rect.x + rect.width
    )
  }

  if (Math.abs(from.x - to.x) < 0.001) {
    const minY = Math.min(from.y, to.y)
    const maxY = Math.max(from.y, to.y)
    return (
      from.x >= rect.x &&
      from.x <= rect.x + rect.width &&
      maxY >= rect.y &&
      minY <= rect.y + rect.height
    )
  }

  return false
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getOverviewArrowLabelPosition(
  points: Array<{ x: number; y: number }>,
  laneOffset: number,
  labelWidth: number,
  labelHeight: number,
  occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }>,
  arrowTarget: "block" | "label",
): { x: number; y: number } {
  const [from, to] = points
  if (!from || !to) return { x: 0, y: 0 }

  const midpoint = {
    x: from.x + (to.x - from.x) / 2,
    y: from.y + (to.y - from.y) / 2,
  }
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
  const routeLength = getPointDistance(from, to)
  const shortRoute = routeLength < labelWidth + 96 || arrowTarget === "label"
  const unit =
    routeLength > 0
      ? {
          x: (to.x - from.x) / routeLength,
          y: (to.y - from.y) / routeLength,
        }
      : { x: 1, y: 0 }
  const labelAnchor = shortRoute
    ? {
        x: from.x + unit.x * Math.min(routeLength * 0.45, labelWidth / 2 + 64),
        y: from.y + unit.y * Math.min(routeLength * 0.45, labelHeight / 2 + 64),
      }
    : midpoint
  const veryShortRoute = routeLength < labelWidth + 48
  const offsets =
    arrowTarget === "label"
      ? [0, 82, 164, -82, -164]
      : horizontal
        ? veryShortRoute
          ? [-30, 30, -52, 52, 0]
          : [0, -24, 24, -44, 44]
        : [0, -30, 30, -54, 54]

  for (const offset of offsets) {
    const candidate =
      arrowTarget === "label"
        ? horizontal
          ? { x: labelAnchor.x + offset, y: labelAnchor.y }
          : { x: labelAnchor.x, y: labelAnchor.y + offset }
        : horizontal
          ? { x: labelAnchor.x, y: labelAnchor.y + offset }
          : { x: labelAnchor.x, y: labelAnchor.y + offset }
    const candidateRect = {
      x: candidate.x - labelWidth / 2,
      y: candidate.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    }
    if (!occupiedLabelRects.some((rect) => rectsOverlap(candidateRect, rect))) {
      return candidate
    }
  }

  return horizontal
    ? {
        x:
          labelAnchor.x +
          (arrowTarget === "label" ? Math.sign(laneOffset || 1) * 220 : 0),
        y:
          labelAnchor.y +
          (arrowTarget === "label" ? 0 : Math.sign(laneOffset || 1) * 64),
      }
    : {
        x: labelAnchor.x,
        y:
          labelAnchor.y +
          (arrowTarget === "label"
            ? Math.sign(laneOffset || 1) * 220
            : Math.sign(laneOffset || 1) * 80),
      }
}

function getBlockCenter(block: BlockDiagramBlock): { x: number; y: number } {
  return {
    x: block.x + block.width / 2,
    y: block.y + block.height / 2,
  }
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function getParallelRouteLaneOffsets(
  connections: BlockDiagramConnection[],
  blocks: BlockDiagramBlock[],
): Map<BlockDiagramConnection, number> {
  const blockById = new Map(blocks.map((block) => [block.id, block]))
  const nonRailConnectionsByBlockPair = new Map<
    string,
    BlockDiagramConnection[]
  >()
  const railConnectionsByBlockAndNet = new Map<
    string,
    BlockDiagramConnection[]
  >()

  for (const connection of connections) {
    const fromBlock = blockById.get(connection.fromBlockId)
    const toBlock = blockById.get(connection.toBlockId)
    if (!fromBlock || !toBlock) continue
    const hasRailBlock = fromBlock.kind === "rail" || toBlock.kind === "rail"

    if (hasRailBlock && isPowerNetName(connection.label)) {
      const componentBlock = fromBlock.kind === "rail" ? toBlock : fromBlock
      const key = `${componentBlock.id}:${normalizeNetName(connection.label)}`
      const railConnections = railConnectionsByBlockAndNet.get(key) ?? []
      railConnections.push(connection)
      railConnectionsByBlockAndNet.set(key, railConnections)
      continue
    }

    if (!hasRailBlock) {
      const [a, b] = [connection.fromBlockId, connection.toBlockId].sort()
      const key = `${a}:${b}`
      const pairConnections = nonRailConnectionsByBlockPair.get(key) ?? []
      pairConnections.push(connection)
      nonRailConnectionsByBlockPair.set(key, pairConnections)
    }
  }

  const laneOffsets = new Map<BlockDiagramConnection, number>()
  const nonRailLaneStep = 96
  for (const pairConnections of nonRailConnectionsByBlockPair.values()) {
    const labels = [
      ...new Set(
        pairConnections.map((connection) => normalizeNetName(connection.label)),
      ),
    ]
    if (labels.length <= 1) continue

    const centerIndex = (labels.length - 1) / 2
    for (const [index, connection] of pairConnections.entries()) {
      const labelIndex = labels.indexOf(normalizeNetName(connection.label))
      laneOffsets.set(
        connection,
        (labelIndex === -1 ? index - centerIndex : labelIndex - centerIndex) *
          nonRailLaneStep,
      )
    }
  }

  const railLaneStep = 28
  for (const railConnections of railConnectionsByBlockAndNet.values()) {
    if (railConnections.length <= 1) continue

    const centerIndex = (railConnections.length - 1) / 2
    for (const [index, connection] of railConnections.entries()) {
      laneOffsets.set(
        connection,
        (laneOffsets.get(connection) ?? 0) +
          (index - centerIndex) * railLaneStep,
      )
    }
  }

  return laneOffsets
}

function getCandidateNetNames(
  trace: SourceTraceLike,
  ports: SourcePortLike[],
  sourceNetIds: string[],
  netsById: Map<string, SourceNetLike>,
): string[] {
  return unique([
    ...sourceNetIds
      .map((sourceNetId) => netsById.get(sourceNetId)?.name ?? sourceNetId)
      .filter(Boolean),
    ...ports.map((port) => port.name).filter(Boolean),
    trace.display_name,
  ]).flatMap((name) => splitNameTokens(name))
}

function inferInterfaceLabel(names: string[]): string | undefined {
  for (const name of names) {
    const normalizedName = normalizeNetName(name)
    const exact = INTERFACE_LABELS.get(normalizedName)
    if (exact) return exact

    for (const [token, label] of INTERFACE_LABELS) {
      if (
        new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(normalizedName)
      ) {
        return label
      }
    }
  }
}

function addConnection(
  connectionMap: Map<string, BlockDiagramConnection>,
  connection: BlockDiagramConnection,
) {
  const [fromBlockId, toBlockId] = [
    connection.fromBlockId,
    connection.toBlockId,
  ].sort()
  const key = `${fromBlockId}:${toBlockId}:${connection.label}`
  const existingConnection = connectionMap.get(key)

  if (existingConnection) {
    existingConnection.sourceNetIds = unique([
      ...existingConnection.sourceNetIds,
      ...connection.sourceNetIds,
    ])
    return
  }

  connectionMap.set(key, connection)
}

function isSourceComponent(
  elm: AnyCircuitElement,
): elm is AnyCircuitElement & SourceComponentLike {
  return (
    elm.type === "source_component" &&
    typeof (elm as SourceComponentLike).source_component_id === "string"
  )
}

function isSourcePort(
  elm: AnyCircuitElement,
): elm is AnyCircuitElement & SourcePortLike {
  return (
    elm.type === "source_port" &&
    typeof (elm as SourcePortLike).source_port_id === "string"
  )
}

function isSourceTrace(
  elm: AnyCircuitElement,
): elm is AnyCircuitElement & SourceTraceLike {
  return (
    elm.type === "source_trace" &&
    typeof (elm as SourceTraceLike).source_trace_id === "string"
  )
}

function isSourceNet(
  elm: AnyCircuitElement,
): elm is AnyCircuitElement & SourceNetLike {
  return (
    elm.type === "source_net" &&
    typeof (elm as SourceNetLike).source_net_id === "string"
  )
}

function isSourceGroup(
  elm: AnyCircuitElement,
): elm is AnyCircuitElement & SourceGroupLike {
  return (
    elm.type === "source_group" &&
    typeof (elm as SourceGroupLike).source_group_id === "string"
  )
}

function isPrimaryComponent(component: SourceComponentLike): boolean {
  const ftype = normalizeNetName(component.ftype ?? "")
  return (
    ftype.includes("CHIP") ||
    ftype.includes("IC") ||
    ftype.includes("MCU") ||
    ftype.includes("MODULE") ||
    ftype.includes("SOURCE")
  )
}

function isPowerOutputPort(
  component: SourceComponentLike,
  port: SourcePortLike,
  powerName: string,
): boolean {
  const ftype = normalizeNetName(component.ftype ?? "")
  const componentLooksLikePowerSource =
    ftype.includes("REGULATOR") ||
    ftype.includes("POWER_SOURCE") ||
    ftype.includes("BATTERY") ||
    ftype.includes("SUPPLY")
  if (!componentLooksLikePowerSource) return false

  const portName = normalizeNetName(port.name ?? "")
  const normalizedPowerName = normalizeNetName(powerName)
  return (
    portName === normalizedPowerName ||
    portName.includes("VOUT") ||
    portName.includes("VBUS") ||
    portName === "OUT" ||
    portName === "PWR" ||
    portName === "POWER" ||
    portName.endsWith("_OUT")
  )
}

function isPassiveComponent(component: SourceComponentLike): boolean {
  const ftype = normalizeNetName(component.ftype ?? "")
  return (
    ftype.includes("RESISTOR") ||
    ftype.includes("CAPACITOR") ||
    ftype.includes("INDUCTOR") ||
    ftype.includes("DIODE")
  )
}

function isPowerNetName(name: string): boolean {
  return POWER_NET_NAMES.has(normalizeNetName(name))
}

function normalizeNetName(name: string): string {
  return name
    .trim()
    .replace(/^[.#]+/, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toUpperCase()
}

function splitNameTokens(name: string | undefined): string[] {
  if (!name) return []
  return name
    .split(/[^a-z0-9_]+/i)
    .map(normalizeNetName)
    .filter(Boolean)
}

function readableId(id: string): string {
  return id
    .replace(/^subcircuit_/, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(" ")
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function group(
  attributes: Record<string, string>,
  children: SvgObject[],
): SvgObject {
  return {
    name: "g",
    type: "element",
    attributes,
    value: "",
    children,
  }
}

function rect(attributes: Record<string, string>): SvgObject {
  return {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: [],
  }
}

function path(attributes: Record<string, string>): SvgObject {
  return {
    name: "path",
    type: "element",
    attributes,
    value: "",
    children: [],
  }
}

function text(attributes: Record<string, string>, value: string): SvgObject {
  return {
    name: "text",
    type: "element",
    attributes,
    value: "",
    children: [
      {
        name: "",
        type: "text",
        attributes: {},
        value,
        children: [],
      },
    ],
  }
}

export default convertCircuitJsonToBlockDiagramSvg
