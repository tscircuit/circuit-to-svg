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
  jumpPoints: Array<{ x: number; y: number }>
  labelPosition?: { x: number; y: number }
}

interface ConnectionAnchor {
  x: number
  y: number
  side: "left" | "right" | "top" | "bottom"
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
            .block-diagram-connection { stroke: #475569; stroke-width: 1.5; fill: none; }
            .block-diagram-label-bg { fill: #fff; stroke: #cbd5e1; stroke-width: 1; rx: 4; ry: 4; }
            .block-diagram-label { fill: #0f172a; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; dominant-baseline: middle; }
          `,
          children: [],
        },
      ],
    },
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
  const netsById = new Map(sourceNets.map((net) => [net.source_net_id, net]))
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
  const componentColumnGap = 120
  const primaryX = hasSupportColumn
    ? Math.max(250, width * 0.44 - primaryBlockWidth / 2)
    : Math.max(320, width * 0.55 - primaryBlockWidth / 2)
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
      ports: getBlockPorts(component, portsByComponentId),
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
      getBlockPorts(component, portsByComponentId).length,
    ),
  )

  for (const [index, component] of supportComponents.entries()) {
    const ports = getBlockPorts(component, portsByComponentId)
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
        const block = blockByComponentId.get(port.source_component_id)
        if (!block) return undefined
        return { block, port }
      })
      .filter(
        (
          item,
        ): item is {
          block: BlockDiagramBlock
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

    for (const { block: componentBlock, port } of connectedComponentPorts) {
      for (const targetBlock of targetBlocks) {
        if (componentBlock.id === targetBlock.id) continue
        addConnection(connectionMap, {
          fromBlockId: componentBlock.id,
          toBlockId: targetBlock.id,
          fromSourcePortId: port.source_port_id,
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

  return {
    blocks,
    connections: [...connectionMap.values()],
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
): Array<{ sourcePortId: string; name: string }> {
  return (portsByComponentId.get(component.source_component_id) ?? []).map(
    (port) => ({
      sourcePortId: port.source_port_id,
      name: port.name ?? port.source_port_id,
    }),
  )
}

function getBlockPortsForComponents(
  components: SourceComponentLike[],
  portsByComponentId: Map<string, SourcePortLike[]>,
  options?: { includeComponentName?: boolean },
): Array<{ sourcePortId: string; name: string }> {
  return components.flatMap((component) => {
    const componentName = component.name ?? component.source_component_id

    return (portsByComponentId.get(component.source_component_id) ?? []).map(
      (port) => {
        const portName = port.name ?? port.source_port_id
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

function getComponentBlockHeight(portCount: number, isPrimary = false): number {
  const portRows = Math.ceil(portCount / 2)
  return Math.max(isPrimary ? 140 : 92, 78 + portRows * 15)
}

function getStackedBlockY(
  index: number,
  blockHeights: number[],
  svgHeight: number,
): number {
  const gap = 52
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
  return path({
    class: "block-diagram-connection",
    d: pointsToPathD(connection.routePoints, connection.jumpPoints),
    ...(connection.sourceTraceId && {
      "data-source-trace-id": connection.sourceTraceId,
    }),
    ...(connection.sourceNetIds.length > 0 && {
      "data-source-net-ids": connection.sourceNetIds.join(" "),
    }),
  })
}

function createConnectionLabelSvgObject(
  connection: RoutedBlockDiagramConnection,
  blocks: BlockDiagramBlock[],
): SvgObject {
  if (!connection.labelPosition) return group({}, [])

  const fromBlock = blocks.find((block) => block.id === connection.fromBlockId)
  const toBlock = blocks.find((block) => block.id === connection.toBlockId)
  if (!fromBlock || !toBlock) return group({}, [])

  const labelWidth = Math.max(50, connection.label.length * 7 + 16)
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
        connection.label,
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

    for (const jumpPoint of connection.jumpPoints) {
      points.push(
        { x: jumpPoint.x - 10, y: jumpPoint.y - 10 },
        { x: jumpPoint.x + 10, y: jumpPoint.y + 10 },
      )
    }

    if (connection.labelPosition) {
      const labelWidth = Math.max(50, connection.label.length * 7 + 16)
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

function getConnectionLabelPosition({
  x,
  y,
  labelWidth,
  labelHeight,
  blocks,
}: {
  x: number
  y: number
  labelWidth: number
  labelHeight: number
  blocks: BlockDiagramBlock[]
}): { x: number; y: number } {
  const midpoint = { x, y }
  const rectFor = (point: { x: number; y: number }) => ({
    x: point.x - labelWidth / 2,
    y: point.y - labelHeight / 2,
    width: labelWidth,
    height: labelHeight,
  })

  if (!blocks.some((block) => rectsOverlap(rectFor(midpoint), block))) {
    return midpoint
  }

  const offsets = [
    { x: 0, y: 24 },
    { x: 0, y: -24 },
    { x: 36, y: 0 },
    { x: -36, y: 0 },
  ]

  for (const offset of offsets) {
    const point = {
      x: midpoint.x + offset.x,
      y: midpoint.y + offset.y,
    }
    if (!blocks.some((block) => rectsOverlap(rectFor(point), block))) {
      return point
    }
  }

  return midpoint
}

function createRoutedConnections(
  connections: BlockDiagramConnection[],
  blocks: BlockDiagramBlock[],
): RoutedBlockDiagramConnection[] {
  const routedConnections: RoutedBlockDiagramConnection[] = []
  const laneOffsets = getParallelRouteLaneOffsets(connections, blocks)

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

    routedConnections.push({
      ...connectionWithLane,
      routePoints: getConnectionRoutePoints(
        fromBlock,
        toBlock,
        connectionWithLane,
        blocks,
      ),
      jumpPoints: [],
    })
  }

  for (let i = 0; i < routedConnections.length; i++) {
    for (let j = i + 1; j < routedConnections.length; j++) {
      const a = routedConnections[i]
      const b = routedConnections[j]
      if (!a || !b) continue
      if (canShareCrossingWithoutJump(a, b)) continue

      const crossings = getRouteCrossings(a.routePoints, b.routePoints)
      for (const crossing of crossings) {
        if (crossing.horizontalRoute === "a") {
          a.jumpPoints.push(crossing.point)
        } else {
          b.jumpPoints.push(crossing.point)
        }
      }
    }
  }

  for (const connection of routedConnections) {
    connection.jumpPoints = uniquePoints(connection.jumpPoints)
  }

  const allJumpPoints = routedConnections.flatMap(
    (connection) => connection.jumpPoints,
  )
  const occupiedLabelRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }> = []
  const labeledPowerNets = new Set<string>()
  const labeledSourceTraces = new Set<string>()

  for (const connection of routedConnections) {
    const powerNetLabel = isPowerNetName(connection.label)
      ? normalizeNetName(connection.label)
      : undefined
    if (powerNetLabel && labeledPowerNets.has(powerNetLabel)) continue
    if (
      connection.sourceTraceId &&
      labeledSourceTraces.has(connection.sourceTraceId)
    )
      continue

    const labelWidth = Math.max(50, connection.label.length * 7 + 16)
    const labelHeight = 22
    const fromBlock = blocks.find(
      (block) => block.id === connection.fromBlockId,
    )
    const toBlock = blocks.find((block) => block.id === connection.toBlockId)
    const otherRouteRects = routedConnections
      .filter((otherConnection) => otherConnection !== connection)
      .filter(
        (otherConnection) =>
          !canSharePowerLabelTrunk(connection, otherConnection),
      )
      .flatMap((otherConnection) =>
        getRouteAvoidRects(otherConnection.routePoints),
      )
    const avoidRects = [
      ...(fromBlock ? [fromBlock] : []),
      ...(toBlock ? [toBlock] : []),
      ...otherRouteRects,
      ...allJumpPoints.map((point) => ({
        x: point.x - 14,
        y: point.y - 14,
        width: 28,
        height: 28,
      })),
      ...occupiedLabelRects,
    ]

    connection.labelPosition = getRouteLabelPoint(
      connection.routePoints,
      allJumpPoints,
      labelWidth,
      labelHeight,
      avoidRects,
    )
    if (!connection.labelPosition) continue

    occupiedLabelRects.push({
      x: connection.labelPosition.x - labelWidth / 2,
      y: connection.labelPosition.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    })
    if (powerNetLabel) labeledPowerNets.add(powerNetLabel)
    if (connection.sourceTraceId) {
      labeledSourceTraces.add(connection.sourceTraceId)
    }
  }

  return routedConnections
}

function canSharePowerLabelTrunk(
  connection: RoutedBlockDiagramConnection,
  otherConnection: RoutedBlockDiagramConnection,
): boolean {
  if (
    !isPowerNetName(connection.label) ||
    !isPowerNetName(otherConnection.label)
  )
    return false

  const sameNormalizedLabel =
    normalizeNetName(connection.label) ===
    normalizeNetName(otherConnection.label)
  const sameSourceNet = connection.sourceNetIds.some((sourceNetId) =>
    otherConnection.sourceNetIds.includes(sourceNetId),
  )

  return sameNormalizedLabel || sameSourceNet
}

function canShareCrossingWithoutJump(
  connection: RoutedBlockDiagramConnection,
  otherConnection: RoutedBlockDiagramConnection,
): boolean {
  const sameSourceTrace =
    connection.sourceTraceId &&
    connection.sourceTraceId === otherConnection.sourceTraceId
  const sameSourceNet = connection.sourceNetIds.some((sourceNetId) =>
    otherConnection.sourceNetIds.includes(sourceNetId),
  )
  const samePowerLabel =
    isPowerNetName(connection.label) &&
    isPowerNetName(otherConnection.label) &&
    normalizeNetName(connection.label) ===
      normalizeNetName(otherConnection.label)

  return Boolean(sameSourceTrace || sameSourceNet || samePowerLabel)
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
  const nonRailLaneStep = 42
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

function getRouteAvoidRects(points: Array<{ x: number; y: number }>): Array<{
  x: number
  y: number
  width: number
  height: number
}> {
  const routeClearance = 10
  const cornerClearance = 16

  return [
    ...getRouteSegments(points)
      .filter((segment) => segment.orientation !== "other")
      .map((segment) => {
        const minX = Math.min(segment.start.x, segment.end.x)
        const maxX = Math.max(segment.start.x, segment.end.x)
        const minY = Math.min(segment.start.y, segment.end.y)
        const maxY = Math.max(segment.start.y, segment.end.y)

        return {
          x: minX - routeClearance,
          y: minY - routeClearance,
          width: maxX - minX + routeClearance * 2,
          height: maxY - minY + routeClearance * 2,
        }
      }),
    ...points.slice(1, -1).map((point) => ({
      x: point.x - cornerClearance,
      y: point.y - cornerClearance,
      width: cornerClearance * 2,
      height: cornerClearance * 2,
    })),
  ]
}

function getRouteCrossings(
  a: Array<{ x: number; y: number }>,
  b: Array<{ x: number; y: number }>,
): Array<{
  point: { x: number; y: number }
  horizontalRoute: "a" | "b"
}> {
  const crossings: Array<{
    point: { x: number; y: number }
    horizontalRoute: "a" | "b"
  }> = []

  for (const aSegment of getRouteSegments(a)) {
    for (const bSegment of getRouteSegments(b)) {
      const crossing = getOrthogonalCrossing(aSegment, bSegment)
      if (crossing) crossings.push(crossing)
    }
  }

  return crossings
}

function getRouteSegments(points: Array<{ x: number; y: number }>): Array<{
  start: { x: number; y: number }
  end: { x: number; y: number }
  orientation: "horizontal" | "vertical" | "other"
}> {
  return points.slice(1).map((point, index) => {
    const start = points[index]!
    const orientation =
      start.y === point.y
        ? "horizontal"
        : start.x === point.x
          ? "vertical"
          : "other"

    return { start, end: point, orientation }
  })
}

function getOrthogonalCrossing(
  a: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    orientation: "horizontal" | "vertical" | "other"
  },
  b: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    orientation: "horizontal" | "vertical" | "other"
  },
): { point: { x: number; y: number }; horizontalRoute: "a" | "b" } | undefined {
  if (a.orientation === "other" || b.orientation === "other") return undefined
  if (a.orientation === b.orientation) return undefined

  const horizontal = a.orientation === "horizontal" ? a : b
  const vertical = a.orientation === "vertical" ? a : b
  const x = vertical.start.x
  const y = horizontal.start.y
  const padding = 8

  const hMin = Math.min(horizontal.start.x, horizontal.end.x) + padding
  const hMax = Math.max(horizontal.start.x, horizontal.end.x) - padding
  const vMin = Math.min(vertical.start.y, vertical.end.y) + padding
  const vMax = Math.max(vertical.start.y, vertical.end.y) - padding

  if (x <= hMin || x >= hMax || y <= vMin || y >= vMax) return undefined

  return {
    point: { x, y },
    horizontalRoute: a.orientation === "horizontal" ? "a" : "b",
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

function getConnectionEndpoints(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  connection: BlockDiagramConnection,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromPortAnchor = getPortAnchor(fromBlock, connection.fromSourcePortId)
  const toPortAnchor = getPortAnchor(toBlock, connection.toSourcePortId)
  const fromCenterX = fromBlock.x + fromBlock.width / 2
  const fromCenterY = fromBlock.y + fromBlock.height / 2
  const toCenterX = toBlock.x + toBlock.width / 2
  const toCenterY = toBlock.y + toBlock.height / 2
  const horizontal =
    Math.abs(toCenterX - fromCenterX) >= Math.abs(toCenterY - fromCenterY)

  if (horizontal) {
    const x1 =
      fromPortAnchor?.x ??
      (toCenterX > fromCenterX ? fromBlock.x + fromBlock.width : fromBlock.x)
    const x2 =
      toPortAnchor?.x ??
      (toCenterX > fromCenterX ? toBlock.x : toBlock.x + toBlock.width)

    return {
      x1,
      y1: fromPortAnchor?.y ?? fromCenterY,
      x2,
      y2: toPortAnchor?.y ?? toCenterY,
    }
  }

  return {
    x1: fromPortAnchor?.x ?? fromCenterX,
    y1:
      fromPortAnchor?.y ??
      (toCenterY > fromCenterY ? fromBlock.y + fromBlock.height : fromBlock.y),
    x2: toPortAnchor?.x ?? toCenterX,
    y2:
      toPortAnchor?.y ??
      (toCenterY > fromCenterY ? toBlock.y : toBlock.y + toBlock.height),
  }
}

function getPortAnchor(
  block: BlockDiagramBlock,
  sourcePortId: string | undefined,
): ConnectionAnchor | undefined {
  if (!sourcePortId) return undefined

  const portIndex = block.ports.findIndex(
    (port) => port.sourcePortId === sourcePortId,
  )
  if (portIndex === -1) return undefined

  const leftColumn = portIndex < Math.ceil(block.ports.length / 2)
  const columnIndex = leftColumn
    ? portIndex
    : portIndex - Math.ceil(block.ports.length / 2)

  return {
    x: leftColumn ? block.x : block.x + block.width,
    y: block.y + 58 + columnIndex * 15,
    side: leftColumn ? "left" : "right",
  }
}

function getConnectionAnchor(
  block: BlockDiagramBlock,
  targetBlock: BlockDiagramBlock,
  sourcePortId: string | undefined,
): ConnectionAnchor {
  const portAnchor = getPortAnchor(block, sourcePortId)
  if (portAnchor) return portAnchor

  if (block.kind === "rail") {
    return {
      x: block.x + block.width,
      y: block.y + block.height / 2,
      side: "right",
    }
  }

  const blockCenterX = block.x + block.width / 2
  const blockCenterY = block.y + block.height / 2
  const targetCenterX = targetBlock.x + targetBlock.width / 2
  const targetCenterY = targetBlock.y + targetBlock.height / 2
  const horizontal =
    Math.abs(targetCenterX - blockCenterX) >=
    Math.abs(targetCenterY - blockCenterY)

  if (horizontal) {
    return {
      x: targetCenterX > blockCenterX ? block.x + block.width : block.x,
      y: blockCenterY,
      side: targetCenterX > blockCenterX ? "right" : "left",
    }
  }

  return {
    x: blockCenterX,
    y: targetCenterY > blockCenterY ? block.y + block.height : block.y,
    side: targetCenterY > blockCenterY ? "bottom" : "top",
  }
}

function getConnectionRoutePoints(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  connection: BlockDiagramConnection,
  blocks: BlockDiagramBlock[],
): Array<{ x: number; y: number }> {
  const from = getConnectionAnchor(
    fromBlock,
    toBlock,
    connection.fromSourcePortId,
  )
  const to = getConnectionAnchor(toBlock, fromBlock, connection.toSourcePortId)
  const clearance = 120
  const laneOffset = getConnectionLaneOffset(connection)
  const railGapLaneX = getRailApproachLaneX(blocks, connection, laneOffset)
  const componentGapLaneX = getComponentGapLaneX(blocks) + laneOffset
  const topLaneY = Math.max(24, Math.min(fromBlock.y, toBlock.y) - clearance)
  const bottomLaneY =
    Math.max(fromBlock.y + fromBlock.height, toBlock.y + toBlock.height) +
    clearance

  if (
    (from.side === "left" && toBlock.kind === "rail") ||
    (to.side === "right" && fromBlock.kind === "rail")
  ) {
    const usesSupportLane =
      fromBlock.kind === "support" || toBlock.kind === "support"
    const laneX = usesSupportLane ? componentGapLaneX : railGapLaneX
    const railAnchor = fromBlock.kind === "rail" ? from : to
    return dedupePoints([
      from,
      { x: laneX, y: from.y },
      { x: laneX, y: railAnchor.y },
      to,
    ])
  }

  if (
    (from.side === "right" && toBlock.kind === "rail") ||
    (to.side === "left" && fromBlock.kind === "rail")
  ) {
    const rightLaneX =
      Math.max(fromBlock.x + fromBlock.width, toBlock.x + toBlock.width) +
      clearance +
      getRailRightLaneOffset(connection)
    const railAnchor = fromBlock.kind === "rail" ? from : to
    const railApproachLaneX = getRailApproachLaneX(
      blocks,
      connection,
      laneOffset,
    )
    const railTopLaneY = getRailTopLaneY(connection, topLaneY, railAnchor)
    return dedupePoints([
      from,
      { x: rightLaneX, y: from.y },
      { x: rightLaneX, y: railTopLaneY },
      { x: railApproachLaneX, y: railTopLaneY },
      { x: railApproachLaneX, y: railAnchor.y },
      to,
    ])
  }

  if (from.side === "right" && to.side === "left" && from.x <= to.x) {
    const midX = from.x + (to.x - from.x) / 2 + laneOffset
    return dedupePoints([
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to,
    ])
  }

  if (from.side === "left" && to.side === "right" && from.x >= to.x) {
    const midX = to.x + (from.x - to.x) / 2 + laneOffset
    return dedupePoints([
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to,
    ])
  }

  if (from.side === to.side && from.side === "left") {
    const laneX = Math.min(from.x, to.x) - clearance + laneOffset
    const sideBySideRoute = getSideBySideSameSideRoutePoints(
      fromBlock,
      toBlock,
      from,
      to,
      laneX,
      laneOffset,
    )
    if (sideBySideRoute) return sideBySideRoute

    return dedupePoints([
      from,
      { x: laneX, y: from.y },
      { x: laneX, y: to.y },
      to,
    ])
  }

  if (from.side === to.side && from.side === "right") {
    const laneX =
      Math.max(from.x, to.x) +
      52 +
      Math.max(-20, Math.min(20, laneOffset * 0.4))
    const sideBySideRoute = getSideBySideSameSideRoutePoints(
      fromBlock,
      toBlock,
      from,
      to,
      laneX,
      laneOffset,
    )
    if (sideBySideRoute) return sideBySideRoute

    return dedupePoints([
      from,
      { x: laneX, y: from.y },
      { x: laneX, y: to.y },
      to,
    ])
  }

  if (from.side === "right" && to.side === "left" && from.x > to.x) {
    const rightLaneX = Math.max(from.x, to.x) + clearance + laneOffset
    const leftLaneX = Math.min(from.x, to.x) - clearance + laneOffset
    return dedupePoints([
      from,
      { x: rightLaneX, y: from.y },
      { x: rightLaneX, y: bottomLaneY },
      { x: leftLaneX, y: bottomLaneY },
      { x: leftLaneX, y: to.y },
      to,
    ])
  }

  const fromExit = getExitPoint(from, clearance)
  const toExit = getExitPoint(to, clearance)
  const midX = fromExit.x + (toExit.x - fromExit.x) / 2 + laneOffset

  return dedupePoints([
    from,
    fromExit,
    { x: midX, y: fromExit.y },
    { x: midX, y: toExit.y },
    toExit,
    to,
  ])
}

function getRailGapLaneX(blocks: BlockDiagramBlock[]): number {
  const railRight = Math.max(
    0,
    ...blocks
      .filter((block) => block.kind === "rail")
      .map((block) => block.x + block.width),
  )
  const leftmostComponentX = Math.min(
    Number.POSITIVE_INFINITY,
    ...blocks.filter((block) => block.kind !== "rail").map((block) => block.x),
  )

  if (!Number.isFinite(leftmostComponentX)) return railRight + 40
  return railRight + (leftmostComponentX - railRight) / 2
}

function getRailApproachLaneX(
  blocks: BlockDiagramBlock[],
  connection: BlockDiagramConnection,
  laneOffset: number,
): number {
  const railRight = Math.max(
    0,
    ...blocks
      .filter((block) => block.kind === "rail")
      .map((block) => block.x + block.width),
  )
  const leftmostComponentX = Math.min(
    Number.POSITIVE_INFINITY,
    ...blocks.filter((block) => block.kind !== "rail").map((block) => block.x),
  )
  const unclampedLaneX = getRailGapLaneX(blocks) + laneOffset
  const minLaneX = railRight + getRailApproachLaneMinimumOffset(connection)
  const maxLaneX = leftmostComponentX - 42

  if (!Number.isFinite(leftmostComponentX) || minLaneX > maxLaneX) {
    return Math.max(unclampedLaneX, minLaneX)
  }

  return Math.max(minLaneX, Math.min(maxLaneX, unclampedLaneX))
}

function getRailApproachLaneMinimumOffset(
  connection: BlockDiagramConnection,
): number {
  const normalizedLabel = normalizeNetName(connection.label)
  if (normalizedLabel.includes("VDD") || normalizedLabel.includes("VCC")) {
    return 40
  }
  if (normalizedLabel.includes("GND")) return 72

  return 56
}

function getComponentGapLaneX(blocks: BlockDiagramBlock[]): number {
  const primaryRight = Math.max(
    Number.NEGATIVE_INFINITY,
    ...blocks
      .filter((block) => block.kind === "primary")
      .map((block) => block.x + block.width),
  )
  const supportLeft = Math.min(
    Number.POSITIVE_INFINITY,
    ...blocks
      .filter((block) => block.kind === "support")
      .map((block) => block.x),
  )

  if (!Number.isFinite(primaryRight) || !Number.isFinite(supportLeft)) {
    return getRailGapLaneX(blocks)
  }

  return primaryRight + (supportLeft - primaryRight) / 2
}

function getConnectionLaneOffset(connection: BlockDiagramConnection): number {
  const normalizedLabel = normalizeNetName(connection.label)
  const routeLaneOffset = connection.routeLaneOffset ?? 0
  if (normalizedLabel.includes("VDD") || normalizedLabel.includes("VCC")) {
    return -48 + routeLaneOffset
  }
  if (normalizedLabel.includes("GND")) return -8 + routeLaneOffset

  return routeLaneOffset
}

function getRailTopLaneY(
  connection: BlockDiagramConnection,
  topLaneY: number,
  railAnchor: ConnectionAnchor,
): number {
  const normalizedLabel = normalizeNetName(connection.label)
  if (normalizedLabel.includes("VDD") || normalizedLabel.includes("VCC")) {
    return railAnchor.y
  }
  if (normalizedLabel.includes("GND")) {
    return Math.max(topLaneY + 24, railAnchor.y - 52)
  }

  return topLaneY
}

function getRailRightLaneOffset(connection: BlockDiagramConnection): number {
  const normalizedLabel = normalizeNetName(connection.label)
  if (normalizedLabel.includes("VDD") || normalizedLabel.includes("VCC")) {
    return -24
  }
  if (normalizedLabel.includes("GND")) return 16

  return 0
}

function getSideBySideSameSideRoutePoints(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  from: ConnectionAnchor,
  to: ConnectionAnchor,
  outsideLaneX: number,
  laneOffset: number,
): Array<{ x: number; y: number }> | undefined {
  const fromIsLeftOfTo = fromBlock.x + fromBlock.width < toBlock.x
  const toIsLeftOfFrom = toBlock.x + toBlock.width < fromBlock.x
  if (!fromIsLeftOfTo && !toIsLeftOfFrom) return undefined
  if (
    !sameSideRouteCrossesBlockInterior(
      fromBlock,
      toBlock,
      from,
      to,
      outsideLaneX,
    )
  ) {
    return undefined
  }

  const leftBlock = fromIsLeftOfTo ? fromBlock : toBlock
  const rightBlock = fromIsLeftOfTo ? toBlock : fromBlock
  const openLaneX =
    leftBlock.x +
    leftBlock.width +
    (rightBlock.x - (leftBlock.x + leftBlock.width)) / 2
  const detourY =
    Math.max(fromBlock.y + fromBlock.height, toBlock.y + toBlock.height) +
    36 +
    Math.abs(laneOffset) * 0.15

  if (from.side === "left" && fromIsLeftOfTo) {
    return dedupePoints([
      from,
      { x: outsideLaneX, y: from.y },
      { x: outsideLaneX, y: detourY },
      { x: openLaneX, y: detourY },
      { x: openLaneX, y: to.y },
      to,
    ])
  }

  if (from.side === "left" && toIsLeftOfFrom) {
    return dedupePoints([
      from,
      { x: openLaneX, y: from.y },
      { x: openLaneX, y: detourY },
      { x: outsideLaneX, y: detourY },
      { x: outsideLaneX, y: to.y },
      to,
    ])
  }

  if (from.side === "right" && fromIsLeftOfTo) {
    return dedupePoints([
      from,
      { x: openLaneX, y: from.y },
      { x: openLaneX, y: detourY },
      { x: outsideLaneX, y: detourY },
      { x: outsideLaneX, y: to.y },
      to,
    ])
  }

  if (from.side === "right" && toIsLeftOfFrom) {
    return dedupePoints([
      from,
      { x: outsideLaneX, y: from.y },
      { x: outsideLaneX, y: detourY },
      { x: openLaneX, y: detourY },
      { x: openLaneX, y: to.y },
      to,
    ])
  }

  return undefined
}

function sameSideRouteCrossesBlockInterior(
  fromBlock: BlockDiagramBlock,
  toBlock: BlockDiagramBlock,
  from: ConnectionAnchor,
  to: ConnectionAnchor,
  outsideLaneX: number,
): boolean {
  return [fromBlock, toBlock].some(
    (block) =>
      horizontalSegmentCrossesBlockInterior(
        from.x,
        outsideLaneX,
        from.y,
        block,
      ) ||
      horizontalSegmentCrossesBlockInterior(outsideLaneX, to.x, to.y, block),
  )
}

function horizontalSegmentCrossesBlockInterior(
  x1: number,
  x2: number,
  y: number,
  block: BlockDiagramBlock,
): boolean {
  const edgeAllowance = 3
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const blockMinX = block.x + edgeAllowance
  const blockMaxX = block.x + block.width - edgeAllowance
  const blockMinY = block.y + edgeAllowance
  const blockMaxY = block.y + block.height - edgeAllowance

  return y > blockMinY && y < blockMaxY && minX < blockMaxX && maxX > blockMinX
}

function getExitPoint(
  anchor: ConnectionAnchor,
  clearance: number,
): { x: number; y: number } {
  switch (anchor.side) {
    case "left":
      return { x: anchor.x - clearance, y: anchor.y }
    case "right":
      return { x: anchor.x + clearance, y: anchor.y }
    case "top":
      return { x: anchor.x, y: anchor.y - clearance }
    case "bottom":
      return { x: anchor.x, y: anchor.y + clearance }
  }
}

function dedupePoints<T extends { x: number; y: number }>(points: T[]): T[] {
  return points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })
}

function uniquePoints<T extends { x: number; y: number }>(points: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []

  for (const point of points) {
    const key = `${point.x}:${point.y}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(point)
  }

  return unique
}

function getRouteMidpoint(points: Array<{ x: number; y: number }>): {
  x: number
  y: number
} {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]!

  const segments = points.slice(1).map((point, index) => ({
    start: points[index]!,
    end: point,
    length:
      Math.abs(point.x - points[index]!.x) +
      Math.abs(point.y - points[index]!.y),
  }))
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  let remaining = totalLength / 2

  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length === 0 ? 0 : remaining / segment.length
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      }
    }
    remaining -= segment.length
  }

  return points[points.length - 1]!
}

function getRouteLabelPoint(
  points: Array<{ x: number; y: number }>,
  jumpPoints: Array<{ x: number; y: number }>,
  labelWidth: number,
  labelHeight: number,
  avoidRects: Array<{
    x: number
    y: number
    width: number
    height: number
  }> = [],
): { x: number; y: number } | undefined {
  const bendClearance = 24
  const jumpClearance = 28
  const minimumRunway = Math.max(72, Math.max(labelWidth, labelHeight) + 24)
  const candidates = getRouteSegments(points)
    .filter((segment) => segment.orientation !== "other")
    .flatMap((segment) => {
      const horizontal = segment.orientation === "horizontal"
      const min = horizontal
        ? Math.min(segment.start.x, segment.end.x)
        : Math.min(segment.start.y, segment.end.y)
      const max = horizontal
        ? Math.max(segment.start.x, segment.end.x)
        : Math.max(segment.start.y, segment.end.y)
      const labelSize = horizontal ? labelWidth : labelHeight
      const intervals = [
        {
          min: min + bendClearance + labelSize / 2,
          max: max - bendClearance - labelSize / 2,
        },
      ]

      const jumpPositions = jumpPoints
        .filter((jumpPoint) =>
          horizontal
            ? jumpPoint.y === segment.start.y &&
              jumpPoint.x > min &&
              jumpPoint.x < max
            : jumpPoint.x === segment.start.x &&
              jumpPoint.y > min &&
              jumpPoint.y < max,
        )
        .map((jumpPoint) => (horizontal ? jumpPoint.x : jumpPoint.y))

      for (const jumpPosition of jumpPositions) {
        for (let i = intervals.length - 1; i >= 0; i--) {
          const interval = intervals[i]!
          const blockedMin = jumpPosition - jumpClearance - labelSize / 2
          const blockedMax = jumpPosition + jumpClearance + labelSize / 2
          if (blockedMax <= interval.min || blockedMin >= interval.max) continue

          intervals.splice(
            i,
            1,
            { min: interval.min, max: blockedMin },
            { min: blockedMax, max: interval.max },
          )
        }
      }

      return intervals.map((interval) => ({
        segment,
        horizontal,
        usableMin: interval.min,
        usableMax: interval.max,
        usableLength: interval.max - interval.min,
      }))
    })
    .filter((candidate) => candidate.usableLength >= minimumRunway)
    .map((candidate) => {
      const labelRect = getLabelRectForRouteCandidate(
        candidate,
        labelWidth,
        labelHeight,
      )

      return {
        ...candidate,
        labelRect,
        collidesWithAvoidRect: avoidRects.some((rect) =>
          rectsOverlap(labelRect, rect),
        ),
      }
    })
    .filter((candidate) => !candidate.collidesWithAvoidRect)
    .sort((a, b) => {
      if (a.horizontal !== b.horizontal) return a.horizontal ? -1 : 1
      return b.usableLength - a.usableLength
    })

  const best = candidates[0]
  if (!best) return undefined

  const center = best.usableMin + best.usableLength / 2

  return best.horizontal
    ? { x: center, y: best.segment.start.y }
    : { x: best.segment.start.x, y: center }
}

function getLabelRectForRouteCandidate(
  candidate: {
    segment: {
      start: { x: number; y: number }
      end: { x: number; y: number }
      orientation: "horizontal" | "vertical" | "other"
    }
    horizontal: boolean
    usableMin: number
    usableMax: number
    usableLength: number
  },
  labelWidth: number,
  labelHeight: number,
): { x: number; y: number; width: number; height: number } {
  const center = candidate.usableMin + candidate.usableLength / 2

  return candidate.horizontal
    ? {
        x: center - labelWidth / 2,
        y: candidate.segment.start.y - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
      }
    : {
        x: candidate.segment.start.x - labelWidth / 2,
        y: center - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
      }
}

function getLongestStraightSegmentLabelPoint(
  points: Array<{ x: number; y: number }>,
): { x: number; y: number } {
  const longestSegment = getRouteSegments(points)
    .filter((segment) => segment.orientation !== "other")
    .sort((a, b) => {
      const aLength =
        Math.abs(a.start.x - a.end.x) + Math.abs(a.start.y - a.end.y)
      const bLength =
        Math.abs(b.start.x - b.end.x) + Math.abs(b.start.y - b.end.y)
      return bLength - aLength
    })[0]

  if (!longestSegment) return getRouteMidpoint(points)

  return {
    x: (longestSegment.start.x + longestSegment.end.x) / 2,
    y: (longestSegment.start.y + longestSegment.end.y) / 2,
  }
}

function pointsToPathD(
  points: Array<{ x: number; y: number }>,
  jumpPoints: Array<{ x: number; y: number }> = [],
): string {
  const [firstPoint, ...restPoints] = points
  if (!firstPoint) return ""

  const jumpRadius = 8
  const commands = [`M ${firstPoint.x} ${firstPoint.y}`]

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1]!
    const end = points[i]!

    if (start.y !== end.y) {
      commands.push(`L ${end.x} ${end.y}`)
      continue
    }

    const direction = end.x >= start.x ? 1 : -1
    const segmentJumpPoints = jumpPoints
      .filter(
        (point) =>
          point.y === start.y &&
          point.x > Math.min(start.x, end.x) + jumpRadius &&
          point.x < Math.max(start.x, end.x) - jumpRadius,
      )
      .sort((a, b) => (a.x - b.x) * direction)

    for (const jumpCluster of clusterNearbyJumpPoints(
      segmentJumpPoints,
      jumpRadius * 2 + 8,
    )) {
      const firstJumpPoint = jumpCluster[0]!
      const lastJumpPoint = jumpCluster[jumpCluster.length - 1]!
      const beforeX = firstJumpPoint.x - direction * jumpRadius
      const afterX = lastJumpPoint.x + direction * jumpRadius
      const controlX = (firstJumpPoint.x + lastJumpPoint.x) / 2
      const jumpHeight = 12 + Math.min(8, (jumpCluster.length - 1) * 3)
      commands.push(`L ${beforeX} ${firstJumpPoint.y}`)
      commands.push(
        `Q ${controlX} ${firstJumpPoint.y - jumpHeight} ${afterX} ${firstJumpPoint.y}`,
      )
    }

    commands.push(`L ${end.x} ${end.y}`)
  }

  return commands.join(" ")
}

function clusterNearbyJumpPoints(
  jumpPoints: Array<{ x: number; y: number }>,
  threshold: number,
): Array<Array<{ x: number; y: number }>> {
  const clusters: Array<Array<{ x: number; y: number }>> = []

  for (const jumpPoint of jumpPoints) {
    const currentCluster = clusters[clusters.length - 1]
    const previousJumpPoint = currentCluster?.[currentCluster.length - 1]
    if (
      currentCluster &&
      previousJumpPoint &&
      Math.abs(jumpPoint.x - previousJumpPoint.x) <= threshold
    ) {
      currentCluster.push(jumpPoint)
      continue
    }

    clusters.push([jumpPoint])
  }

  return clusters
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
  const [fromSourcePortId = "", toSourcePortId = ""] = [
    connection.fromSourcePortId,
    connection.toSourcePortId,
  ].sort()
  const key = `${fromBlockId}:${toBlockId}:${fromSourcePortId}:${toSourcePortId}:${connection.label}`
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

function line(attributes: Record<string, string>): SvgObject {
  return {
    name: "line",
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
