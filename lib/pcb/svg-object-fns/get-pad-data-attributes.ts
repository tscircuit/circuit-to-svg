import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

type PadLike = {
  pcb_port_id?: string
  pcb_smtpad_id?: string
  pcb_plated_hole_id?: string
  source_port_id?: string
}

type DataAttributes = Record<string, string>

export function getPadDataAttributes(
  element: PadLike,
  circuitJson: AnyCircuitElement[] | undefined,
): DataAttributes {
  if (!circuitJson) return {}

  const sourcePortId = getSourcePortId(element, circuitJson)
  if (!sourcePortId) return {}

  const sourcePort = circuitJson.find(
    (elm) =>
      elm.type === "source_port" &&
      (elm as { source_port_id?: string }).source_port_id === sourcePortId,
  ) as
    | {
        name?: string
        source_component_id?: string
      }
    | undefined

  const sourceComponent = circuitJson.find(
    (elm) =>
      elm.type === "source_component" &&
      (elm as { source_component_id?: string }).source_component_id ===
        sourcePort?.source_component_id,
  ) as { name?: string } | undefined

  const dataAttributes: DataAttributes = {}
  if (sourceComponent?.name && sourcePort?.name) {
    dataAttributes["data-pad-name"] =
      `${sourceComponent.name}.${sourcePort.name}`
  }

  const sourceNetName = getConnectedSourceNetName(sourcePortId, circuitJson)
  if (sourceNetName) {
    dataAttributes["data-pad-net-name"] = sourceNetName
  }

  return dataAttributes
}

function getSourcePortId(
  element: PadLike,
  circuitJson: AnyCircuitElement[],
): string | undefined {
  if (element.source_port_id) return element.source_port_id

  if (element.pcb_port_id) {
    const pcbPort = circuitJson.find(
      (elm) =>
        elm.type === "pcb_port" &&
        (elm as { pcb_port_id?: string }).pcb_port_id === element.pcb_port_id,
    ) as { source_port_id?: string } | undefined
    if (pcbPort?.source_port_id) return pcbPort.source_port_id
  }

  const physicalPadId = element.pcb_smtpad_id ?? element.pcb_plated_hole_id
  if (!physicalPadId) return undefined

  const pcbPort = circuitJson.find((elm) => {
    if (elm.type !== "pcb_port") return false
    const port = elm as {
      pcb_smtpad_id?: string
      pcb_plated_hole_id?: string
    }
    return (
      port.pcb_smtpad_id === physicalPadId ||
      port.pcb_plated_hole_id === physicalPadId
    )
  }) as { source_port_id?: string } | undefined

  return pcbPort?.source_port_id
}

function getConnectedSourceNetName(
  sourcePortId: string,
  circuitJson: AnyCircuitElement[],
): string | undefined {
  const sourceTrace = circuitJson.find((elm) => {
    if (elm.type !== "source_trace") return false
    const connectedPortIds = (elm as { connected_source_port_ids?: string[] })
      .connected_source_port_ids
    return connectedPortIds?.includes(sourcePortId)
  }) as { connected_source_net_ids?: string[] } | undefined

  const sourceNetId = sourceTrace?.connected_source_net_ids?.[0]
  if (!sourceNetId) return undefined

  const sourceNet = circuitJson.find(
    (elm) =>
      elm.type === "source_net" &&
      (elm as { source_net_id?: string }).source_net_id === sourceNetId,
  ) as { name?: string } | undefined

  return sourceNet?.name
}

export function addDataAttributesToMatchingSvgObjects(
  svgObjects: SvgObject[],
  dataType: string,
  dataAttributes: DataAttributes,
): SvgObject[] {
  if (Object.keys(dataAttributes).length === 0) return svgObjects

  return svgObjects.map((svgObject) =>
    addDataAttributesToMatchingSvgObject(svgObject, dataType, dataAttributes),
  )
}

function addDataAttributesToMatchingSvgObject(
  svgObject: SvgObject,
  dataType: string,
  dataAttributes: DataAttributes,
): SvgObject {
  const attributes =
    svgObject.attributes?.["data-type"] === dataType
      ? { ...svgObject.attributes, ...dataAttributes }
      : svgObject.attributes

  return {
    ...svgObject,
    attributes,
    children: svgObject.children.map((child) =>
      addDataAttributesToMatchingSvgObject(child, dataType, dataAttributes),
    ),
  }
}
