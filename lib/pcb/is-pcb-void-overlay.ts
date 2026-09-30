import type { SvgObject } from "../svg-object"

export function isPcbVoidOverlay(object: SvgObject): boolean {
  if (object.attributes?.class === "pcb-via-tenting") {
    return object.attributes.mask !== undefined
  }
  const elementType = object.attributes?.["data-type"] ?? ""
  return (
    elementType.startsWith("pcb_fabrication_note_") ||
    elementType.startsWith("pcb_note_") ||
    elementType.endsWith("_error") ||
    elementType.endsWith("_warning") ||
    elementType === "pcb_rats_nest" ||
    elementType === "pcb_debug_object"
  )
}
