import type { LayerRef } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

export function createSoldermaskOpeningMasks({
  objects,
  layer,
  width,
  height,
  showSolderMask = false,
}: {
  objects: SvgObject[]
  layer: LayerRef
  width: number
  height: number
  showSolderMask?: boolean
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
  // Pours and their mask overlays are drawn after pads. Clip both at pad
  // openings so exposed copper is neither tinted nor covered by the pour.
  const pours = objects.filter(
    (object) =>
      showSolderMask &&
      object.attributes["data-pcb-layer"] === layer &&
      (object.attributes["data-type"] === "pcb_copper_pour" ||
        object.attributes.class === "pcb-soldermask-covered-pour"),
  )
  const padOpenings = openings.filter(
    (object) =>
      object.attributes.class === "pcb-pad" ||
      object.attributes.class === "pcb-pad-exposed",
  )
  const masks: SvgObject[] = []
  for (const { targets, cutouts, maskId } of [
    {
      targets: tenting,
      cutouts: openings,
      maskId: `via-tenting-mask-${layer}`,
    },
    {
      targets: pours,
      cutouts: padOpenings,
      maskId: `copper-pour-pad-opening-mask-${layer}`,
    },
  ]) {
    if (targets.length === 0 || cutouts.length === 0) continue
    for (const object of targets) {
      object.attributes.mask = `url(#${maskId})`
    }
    masks.push(createOpeningMask(maskId, cutouts, width, height))
  }
  if (masks.length === 0) return null

  return {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: masks,
  }
}

function createOpeningMask(
  maskId: string,
  openings: SvgObject[],
  width: number,
  height: number,
): SvgObject {
  return {
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
  }
}
