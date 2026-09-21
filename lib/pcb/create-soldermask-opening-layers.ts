import type { AnyCircuitElement, PcbSoldermaskOpening } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "./convert-circuit-json-to-pcb-svg"
import { sortSvgObjectsByPcbLayer } from "./sort-svg-objects-by-pcb-layer"
import { groupCopperPourMaskedTraceObjects } from "./copper-pour-trace-mask"

const COPPER_TYPES = new Set([
  "pcb_trace",
  "pcb_copper_pour",
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_via",
  "pcb_copper_text",
])

/** Expose the substrate and actual copper beneath standalone mask apertures. */
export function createSoldermaskOpeningLayers({
  circuitJson,
  ctx,
  create,
}: {
  circuitJson: AnyCircuitElement[]
  ctx: PcbContext
  create: (element: AnyCircuitElement, context: PcbContext) => SvgObject[]
}): SvgObject[] {
  if (!ctx.showSolderMask) return []
  const objects: SvgObject[] = []
  for (const layer of ["bottom", "top"] as const) {
    if (ctx.layer && ctx.layer !== layer) continue
    const openings = circuitJson.filter(
      (element): element is PcbSoldermaskOpening =>
        element.type === "pcb_soldermask_opening" && element.layer === layer,
    )
    if (openings.length === 0) continue
    const shapes = openings.map((opening) => createOpeningShape(opening, ctx))
    const clipId = `pcb-soldermask-openings-${layer}`
    const copperContext = { ...ctx, layer, showSolderMask: false }
    const copper = circuitJson.flatMap((element) =>
      COPPER_TYPES.has(element.type) ? create(element, copperContext) : [],
    )

    objects.push({
      name: "g",
      type: "element",
      value: "",
      attributes: {
        "data-type": "pcb_soldermask_opening_layer",
        "data-pcb-layer": layer,
      },
      children: [
        {
          name: "defs",
          type: "element",
          value: "",
          attributes: {},
          children: [
            {
              name: "clipPath",
              type: "element",
              value: "",
              attributes: { id: clipId, clipPathUnits: "userSpaceOnUse" },
              children: shapes,
            },
          ],
        },
        ...shapes.map((shape, index) => ({
          ...shape,
          attributes: {
            ...shape.attributes,
            fill: ctx.colorMap.substrate,
            "data-type": "pcb_soldermask_opening",
            "data-pcb-layer": layer,
            "data-pcb-soldermask-opening-id":
              openings[index]!.pcb_soldermask_opening_id,
          },
        })),
        {
          name: "g",
          type: "element",
          value: "",
          attributes: { "clip-path": `url(#${clipId})` },
          children: groupCopperPourMaskedTraceObjects(
            sortSvgObjectsByPcbLayer(copper),
          ),
        },
      ],
    })
  }
  return objects
}

function createOpeningShape(
  opening: PcbSoldermaskOpening,
  ctx: PcbContext,
): SvgObject {
  const { transform } = ctx
  const base = { type: "element" as const, value: "", children: [] }
  if (opening.shape === "polygon") {
    return {
      ...base,
      name: "polygon",
      attributes: {
        points: opening.points
          .map((point) => applyToPoint(transform, [point.x, point.y]).join(","))
          .join(" "),
      },
    }
  }
  const [x, y] = applyToPoint(transform, [opening.x, opening.y])
  if (opening.shape === "circle") {
    return {
      ...base,
      name: "circle",
      attributes: {
        cx: String(x),
        cy: String(y),
        r: String(opening.radius * Math.abs(transform.a)),
      },
    }
  }
  const width = opening.width * Math.abs(transform.a)
  const height = opening.height * Math.abs(transform.d)
  return {
    ...base,
    name: "rect",
    attributes: {
      x: String(x - width / 2),
      y: String(y - height / 2),
      width: String(width),
      height: String(height),
      ...(opening.shape === "rotated_rect"
        ? { transform: `rotate(${-opening.ccw_rotation} ${x} ${y})` }
        : {}),
    },
  }
}
