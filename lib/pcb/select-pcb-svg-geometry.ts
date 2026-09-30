import type { SvgObject } from "../svg-object"

export function selectPcbSvgGeometry(
  objects: SvgObject[],
  select: (object: SvgObject) => boolean,
): SvgObject[] {
  return objects.flatMap((object) => {
    if (!object) return []
    if (select(object)) return [object]
    if (!object.children?.length) return []
    const children = selectPcbSvgGeometry(object.children, select)
    return children.length > 0 ? [{ ...object, children }] : []
  })
}
