import type { SvgObject } from "../svg-object"

export function excludePcbSvgGeometry(
  objects: SvgObject[],
  exclude: (object: SvgObject) => boolean,
): SvgObject[] {
  return objects.flatMap((object) => {
    if (!object) return []
    if (exclude(object)) return []
    if (!object.children?.length) return [object]
    const children = excludePcbSvgGeometry(object.children, exclude)
    return children.length > 0 ? [{ ...object, children }] : []
  })
}
