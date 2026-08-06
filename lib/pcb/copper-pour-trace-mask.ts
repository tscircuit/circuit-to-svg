import type {
  AnyCircuitElement,
  LayerRef,
  PcbCopperPour,
  PcbTrace,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { getCopperPourShape } from "./svg-object-fns/get-copper-pour-shape"

/**
 * Traces are drawn as opaque strokes while copper pours of the same net are
 * drawn semi-transparent on top of them, which makes the trace show through
 * the pour. To avoid this, trace strokes are masked so the portion inside a
 * same-net pour is not painted. One mask exists per (layer, source_net_id)
 * pair that has pours; it is white everywhere except over the pour copper.
 */

export function getCopperPourTraceMaskId(
  layer: LayerRef,
  sourceNetId: string,
): string {
  return `copper-pour-trace-mask-${layer}-${sourceNetId}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  )
}

export function getSourceNetIdsForPcbTrace(
  trace: PcbTrace,
  circuitJson: AnyCircuitElement[],
): Set<string> {
  const netIds = new Set<string>()
  const { source_trace_id } = trace
  if (!source_trace_id) return netIds

  for (const elm of circuitJson) {
    // Some traces reference their net directly via source_trace_id
    if (elm.type === "source_net" && elm.source_net_id === source_trace_id) {
      netIds.add(elm.source_net_id)
    }
    if (
      elm.type === "source_trace" &&
      elm.source_trace_id === source_trace_id
    ) {
      for (const netId of elm.connected_source_net_ids ?? []) {
        netIds.add(netId)
      }
    }

    // Autorouted pcb_trace ids are prefixed with the routed source net. Keep
    // that information usable in PCB-only circuit-json exports, which omit
    // source_trace and source_net elements but retain copper-pour net ids.
    if (
      elm.type === "pcb_copper_pour" &&
      elm.source_net_id &&
      (trace.pcb_trace_id === elm.source_net_id ||
        trace.pcb_trace_id.startsWith(`${elm.source_net_id}_`))
    ) {
      netIds.add(elm.source_net_id)
    }
  }

  return netIds
}

/**
 * Returns the mask id to apply to a trace stroke on the given layer, or
 * undefined when no same-net copper pour exists on that layer.
 */
export function getCopperPourTraceMaskIdForLayer({
  traceNetIds,
  layer,
  circuitJson,
}: {
  traceNetIds: Set<string>
  layer: LayerRef
  circuitJson: AnyCircuitElement[]
}): string | undefined {
  if (traceNetIds.size === 0) return undefined

  for (const elm of circuitJson) {
    if (elm.type !== "pcb_copper_pour") continue
    const pour = elm as PcbCopperPour
    if (pour.layer !== layer) continue
    if (!pour.source_net_id) continue
    if (!traceNetIds.has(pour.source_net_id)) continue

    return getCopperPourTraceMaskId(layer, pour.source_net_id)
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
    if (!pour.source_net_id) continue

    const maskId = getCopperPourTraceMaskId(pour.layer, pour.source_net_id)
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
