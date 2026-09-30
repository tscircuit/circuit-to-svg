import type { SvgObject } from "../svg-object"

export function selectPcbDrillGeometry(objects: SvgObject[]): SvgObject[] {
  return objects.flatMap((object) => {
    if (!object) return []
    if (object.attributes?.["data-pcb-layer"] === "drill") return [object]
    if (!object.children?.length) return []
    const tenting = object.children.find(
      (child) => child?.attributes?.class === "pcb-via-tenting",
    )
    if (tenting && tenting.attributes.mask === undefined) return []
    const children = selectPcbDrillGeometry(object.children)
    return children.length > 0 ? [{ ...object, children }] : []
  })
}
