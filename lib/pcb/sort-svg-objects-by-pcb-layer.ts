import type { SvgObject } from "../svg-object"
import type { PcbSvgLayerName } from "./pcb-layer-rendering"

const TYPE_PRIORITY: Record<string, number> = {
  pcb_background: 0,
  pcb_boundary: 1,
  pcb_panel: 5,
  pcb_board: 10,
  pcb_cutout: 15,
  pcb_cutout_path: 15,
  pcb_keepout: 16,
  pcb_hole: 18,
  pcb_plated_hole_drill: 19,
  pcb_plated_hole: 20,
  pcb_trace_soldermask: 25,
  pcb_trace: 30,
  pcb_smtpad: 30,
  pcb_copper_pour: 35,
  pcb_via: 36,
  pcb_soldermask: 40,
  pcb_soldermask_opening: 25,
  pcb_solder_paste: 45,
  pcb_silkscreen_text: 50,
  pcb_silkscreen_path: 50,
  pcb_silkscreen_graphic: 50,
  pcb_silkscreen_rect: 50,
  pcb_silkscreen_circle: 50,
  pcb_silkscreen_line: 50,
  pcb_silkscreen_oval: 50,
  pcb_silkscreen_pill: 50,
  pcb_component: 60,
  pcb_pad_pin_number: 65,
  pcb_fabrication_note_text: 70,
  pcb_fabrication_note_path: 70,
  pcb_fabrication_note_rect: 70,
  pcb_fabrication_note_dimension: 70,
  pcb_note_dimension: 70,
  pcb_note_text: 70,
  pcb_note_rect: 70,
  pcb_note_path: 70,
  pcb_note_line: 70,
  pcb_trace_error: 80,
  pcb_footprint_overlap_error: 80,
  pcb_component_outside_board_error: 80,
  pcb_pad_trace_clearance_error: 80,
  pcb_via_trace_clearance_error: 80,
  pcb_connector_not_in_accessible_orientation_warning: 80,
  pcb_manual_edit_conflict_warning: 80,
  pcb_rats_nest: 85,
  pcb_debug_object: 90,
}

const DEFAULT_TYPE_PRIORITY = 100

export function sortSvgObjectsByPcbLayer({
  objects,
  layerDrawingOrder,
}: {
  objects: SvgObject[]
  layerDrawingOrder?: readonly PcbSvgLayerName[]
}): SvgObject[] {
  const layerPriorityOverrides = getLayerPriorityOverrides(layerDrawingOrder)

  return objects
    .map((object, index) => ({
      object,
      index,
      layerPriority: getLayerPriority(
        object.attributes?.["data-pcb-layer"] ?? undefined,
        layerPriorityOverrides,
      ),
      typePriority: getTypePriority(
        object.attributes?.["data-type"] ?? undefined,
      ),
    }))
    .sort((a, b) => {
      if (a.layerPriority !== b.layerPriority) {
        return a.layerPriority - b.layerPriority
      }

      if (a.typePriority !== b.typePriority) {
        return a.typePriority - b.typePriority
      }

      return a.index - b.index
    })
    .map(({ object }) => object)
}

function getLayerPriority(
  layer: string | undefined,
  layerPriorityOverrides: ReadonlyMap<string, number>,
): number {
  if (!layer) return 500

  const normalized = layer.toLowerCase()
  const priorityOverride = layerPriorityOverrides.get(normalized)
  if (priorityOverride !== undefined) return priorityOverride
  return getDefaultLayerPriority(normalized)
}

function getDefaultLayerPriority(normalizedLayer: string): number {
  const normalized = normalizedLayer.toLowerCase()
  if (normalized === "global") return -100
  if (normalized === "bottom") return 4
  if (normalized === "board") return 2
  if (normalized === "soldermask-top" || normalized === "soldermask-bottom")
    return 3
  if (normalized.startsWith("inner")) {
    const match = normalized.match(/\d+/)
    const layerIndex = match ? Number.parseInt(match[0], 10) : 0
    return 5 + layerIndex
  }
  if (normalized === "through") return 18
  if (normalized === "top") return 17
  if (normalized === "drill") return 30
  if (normalized === "overlay") return 40

  return 10
}

function getLayerPriorityOverrides(
  layerDrawingOrder: readonly PcbSvgLayerName[] | undefined,
): ReadonlyMap<string, number> {
  if (!layerDrawingOrder) return new Map()

  const normalizedLayers = layerDrawingOrder.map((layer) => layer.toLowerCase())
  if (new Set(normalizedLayers).size !== normalizedLayers.length) {
    throw new Error("Layer drawing order cannot contain duplicate layers")
  }

  const availablePriorities = normalizedLayers
    .map(getDefaultLayerPriority)
    .sort((firstPriority, secondPriority) => firstPriority - secondPriority)

  return new Map(
    normalizedLayers.map((layer, index) => [
      layer,
      availablePriorities[availablePriorities.length - index - 1]!,
    ]),
  )
}

function getTypePriority(type?: string): number {
  if (!type) return DEFAULT_TYPE_PRIORITY
  return TYPE_PRIORITY[type] ?? DEFAULT_TYPE_PRIORITY
}
