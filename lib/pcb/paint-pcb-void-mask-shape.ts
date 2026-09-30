import type { SvgObject } from "../svg-object"

export function paintPcbVoidMaskShape(object: SvgObject): SvgObject {
  const sourceType = object.attributes?.["data-type"]
  const geometryAttributes = Object.fromEntries(
    Object.entries(object.attributes ?? {}).filter(
      ([name]) => name !== "class" && !name.startsWith("data-"),
    ),
  )
  return {
    ...object,
    attributes: {
      ...geometryAttributes,
      ...(sourceType ? { "data-pcb-void-source": sourceType } : {}),
      fill: "#000",
      stroke: "#000",
      opacity: "1",
      "fill-opacity": "1",
      "stroke-opacity": "1",
    },
    children: object.children?.map(paintPcbVoidMaskShape) ?? [],
  }
}
