import type { LayerRef } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

export function createViaTentingMask({
  objects,
  layer,
  width,
  height,
}: {
  objects: SvgObject[]
  layer: LayerRef
  width: number
  height: number
}): SvgObject | null {
  const openings = objects.filter(
    (object) =>
      object.attributes["data-pcb-layer"] === layer &&
      (object.attributes.class === "pcb-pad" ||
        object.attributes.class === "pcb-pad-exposed" ||
        object.attributes["data-type"] === "pcb_soldermask_opening"),
  )
  if (openings.length === 0) return null

  const tenting = objects
    .filter((object) => object.attributes["data-type"] === "pcb_via")
    .flatMap((object) => object.children)
    .filter((object) => object.attributes.class === "pcb-via-tenting")
  if (tenting.length === 0) return null

  const maskId = `via-tenting-mask-${layer}`
  for (const object of tenting) {
    object.attributes.mask = `url(#${maskId})`
  }

  return {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "mask",
        type: "element",
        value: "",
        attributes: {
          id: maskId,
          maskUnits: "userSpaceOnUse",
          x: "0",
          y: "0",
          width: String(width),
          height: String(height),
        },
        children: [
          {
            name: "rect",
            type: "element",
            value: "",
            attributes: {
              x: "0",
              y: "0",
              width: String(width),
              height: String(height),
              fill: "white",
            },
            children: [],
          },
          ...openings.map((opening) => ({
            ...opening,
            attributes: { ...opening.attributes, fill: "black" },
          })),
        ],
      },
    ],
  }
}
