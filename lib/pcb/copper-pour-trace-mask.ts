import type { AnyCircuitElement, LayerRef, PcbCopperPour } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { getCopperPourShape } from "./svg-object-fns/get-copper-pour-shape"

/**
 * Traces are drawn as opaque strokes while copper pours are drawn
 * semi-transparent, which makes any overlapping trace show through the pour.
 * To avoid this, trace strokes are masked so portions covered by finalized
 * pour geometry are not painted. One mask exists per layer; BRep clearance
 * rings remain white in the mask, preserving different-net traces there.
 */

export function getCopperPourTraceMaskId(layer: LayerRef): string {
  return `copper-pour-trace-mask-${layer}`.replace(/[^a-zA-Z0-9_-]/g, "_")
}

/**
 * Returns the mask id to apply to a trace stroke on the given layer, or
 * undefined when no copper pour exists on that layer.
 */
export function getCopperPourTraceMaskIdForLayer({
  layer,
  circuitJson,
}: {
  layer: LayerRef
  circuitJson: AnyCircuitElement[]
}): string | undefined {
  for (const elm of circuitJson) {
    if (elm.type !== "pcb_copper_pour") continue
    const pour = elm as PcbCopperPour
    if (pour.layer !== layer) continue

    return getCopperPourTraceMaskId(layer)
  }

  return undefined
}

export function createCopperPourTraceMaskDefs({
  circuitJson,
  transform,
  svgWidth,
  svgHeight,
  usedMaskIds,
}: {
  circuitJson: AnyCircuitElement[]
  transform: Matrix
  svgWidth: number
  svgHeight: number
  usedMaskIds: Set<string>
}): SvgObject | null {
  if (usedMaskIds.size === 0) return null

  const poursByMaskId = new Map<string, PcbCopperPour[]>()
  for (const elm of circuitJson) {
    if (elm.type !== "pcb_copper_pour") continue
    const pour = elm as PcbCopperPour

    const maskId = getCopperPourTraceMaskId(pour.layer)
    if (!usedMaskIds.has(maskId)) continue

    const pours = poursByMaskId.get(maskId)
    if (pours) {
      pours.push(pour)
    } else {
      poursByMaskId.set(maskId, [pour])
    }
  }

  if (poursByMaskId.size === 0) return null

  const masks: SvgObject[] = []
  for (const [maskId, pours] of poursByMaskId) {
    const maskChildren: SvgObject[] = [
      {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          x: "0",
          y: "0",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
          fill: "#fff",
        },
      },
    ]

    for (const pour of pours) {
      const shape = getCopperPourShape(pour, transform)
      if (!shape) continue
      maskChildren.push({
        name: shape.elementType,
        type: "element",
        value: "",
        children: [],
        attributes: {
          ...shape.shapeAttributes,
          fill: "#000",
        },
      })
    }

    masks.push({
      name: "mask",
      type: "element",
      value: "",
      children: maskChildren,
      attributes: {
        id: maskId,
        maskUnits: "userSpaceOnUse",
        x: "0",
        y: "0",
        width: svgWidth.toString(),
        height: svgHeight.toString(),
      },
    })
  }

  return {
    name: "defs",
    type: "element",
    value: "",
    children: masks,
    attributes: {
      class: "copper-pour-trace-mask-defs",
    },
  }
}

/**
 * Applies each layer mask once and merges trace segments that share the same
 * presentation attributes into compound paths. Browsers can then composite
 * a small trace layer in one pass instead of masking hundreds of individual
 * nodes on dense boards.
 */
export function groupCopperPourMaskedTraceObjects(
  objects: SvgObject[],
): SvgObject[] {
  const result: SvgObject[] = []
  const groupsByMask = new Map<
    string,
    {
      object: SvgObject
      pathsByAttributes: Map<string, SvgObject>
    }
  >()

  for (const object of objects) {
    const dataType = object.attributes?.["data-type"]
    const mask = object.attributes?.mask
    const isTrace =
      dataType === "pcb_trace" || dataType === "pcb_trace_soldermask"

    if (!isTrace || !mask?.includes("#copper-pour-trace-mask-")) {
      result.push(object)
      continue
    }

    let group = groupsByMask.get(mask)
    if (!group) {
      const groupObject: SvgObject = {
        name: "g",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-trace-mask-group",
          mask,
        },
      }
      group = {
        object: groupObject,
        pathsByAttributes: new Map<string, SvgObject>(),
      }
      groupsByMask.set(mask, group)
      result.push(groupObject)
    }

    const { mask: _mask, d = "", ...attributes } = object.attributes
    const attributesKey = JSON.stringify(attributes)
    const existingPath = group.pathsByAttributes.get(attributesKey)
    if (existingPath) {
      existingPath.attributes.d += ` ${d}`
      continue
    }

    const mergedPath = {
      ...object,
      attributes: { ...attributes, d },
    }
    group.pathsByAttributes.set(attributesKey, mergedPath)
    group.object.children.push(mergedPath)
  }

  return result
}
