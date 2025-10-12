import type { SvgObject } from "../svg-object"

const TYPE_PRIORITY: Record<string, number> = {
  pcb_background: 0,
  pcb_boundary: 1,
  pcb_board: 10,
  pcb_cutout: 15,
  pcb_hole: 18,
  pcb_plated_hole_drill: 19,
  pcb_plated_hole: 20,
  pcb_trace: 30,
  pcb_smtpad: 30,
  pcb_copper_pour: 35,
  pcb_via: 36,
  pcb_soldermask: 40,
  pcb_solder_paste: 45,
  pcb_silkscreen_text: 50,
  pcb_silkscreen_path: 50,
  pcb_silkscreen_rect: 50,
  pcb_silkscreen_circle: 50,
  pcb_silkscreen_line: 50,
  pcb_component: 60,
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
  pcb_rats_nest: 85,
}

const DEFAULT_TYPE_PRIORITY = 100

export function sortSvgObjectsByPcbLayer(objects: SvgObject[]): SvgObject[] {
  return objects
    .map((object, index) => ({
      object,
      index,
      layerPriority: getLayerPriority(
        object.attributes?.["data-pcb-layer"] ?? undefined,
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

function getLayerPriority(layer?: string): number {
  if (!layer) return 500

  const normalized = layer.toLowerCase()
  if (normalized === "global") return -100
  if (normalized === "bottom") return 0
  if (normalized === "board") return 2
  if (normalized.startsWith("inner")) {
    const match = normalized.match(/\d+/)
    const layerIndex = match ? parseInt(match[0], 10) : 0
    return 5 + layerIndex
  }
  if (normalized === "through") return 18
  if (normalized === "top") return 20
  if (normalized === "drill") return 30
  if (normalized === "overlay") return 40

  return 10
}

function getTypePriority(type?: string): number {
  if (!type) return DEFAULT_TYPE_PRIORITY
  return TYPE_PRIORITY[type] ?? DEFAULT_TYPE_PRIORITY
}
