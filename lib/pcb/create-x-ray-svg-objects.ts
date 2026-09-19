import type { AnyCircuitElement, LayerRef } from "circuit-json"
import type { SvgObject } from "../svg-object"
import type { PcbContext } from "./convert-circuit-json-to-pcb-svg"

const copperTypes = new Set([
  "pcb_trace",
  "pcb_smtpad",
  "pcb_via",
  "pcb_plated_hole",
  "pcb_copper_pour",
  "pcb_copper_text",
])
const group = (
  attributes: Record<string, string>,
  children: SvgObject[],
): SvgObject => ({
  name: "g",
  type: "element",
  value: "",
  attributes,
  children,
})

/** Preserve parent transforms while separating drill geometry from copper. */
function selectGeometry(objects: SvgObject[], drills: boolean): SvgObject[] {
  return objects.flatMap((object) => {
    if (object.children.length) {
      const children = selectGeometry(object.children, drills)
      return children.length ? [{ ...object, children }] : []
    }
    const isDrill = object.attributes["data-pcb-layer"] === "drill"
    return isDrill === drills ? [object] : []
  })
}

function opaque(object: SvgObject): SvgObject {
  const attributes = { ...object.attributes }
  for (const key of ["opacity", "fill-opacity", "stroke-opacity"])
    if (key in attributes) attributes[key] = "1"
  return { ...object, attributes, children: object.children.map(opaque) }
}

function blacken(object: SvgObject): SvgObject {
  return {
    ...object,
    attributes: {
      ...object.attributes,
      ...(object.attributes.fill && object.attributes.fill !== "none"
        ? { fill: "black" }
        : {}),
      ...(object.attributes.stroke && object.attributes.stroke !== "none"
        ? { stroke: "black" }
        : {}),
    },
    children: object.children.map(blacken),
  }
}

/** Composite dimmed copper, selected copper, then selected drills. */
export function createXRaySvgObjects({
  circuitJson,
  ctx,
  selectedIds,
  hiddenOpacity,
  width,
  height,
  create,
}: {
  circuitJson: AnyCircuitElement[]
  ctx: PcbContext
  selectedIds: readonly string[]
  hiddenOpacity: number
  width: number
  height: number
  create: (element: AnyCircuitElement, context: PcbContext) => SvgObject[]
}): SvgObject[] {
  const selected = new Set(selectedIds)
  const id = (element: AnyCircuitElement) =>
    (element as unknown as Record<string, string>)[`${element.type}_id`]!
  const layers = new Set<LayerRef>(["top", "bottom"])
  for (const element of circuitJson) {
    if (element.type === "pcb_board")
      for (let i = 1; i <= (element.num_layers ?? 2) - 2; i++)
        layers.add(`inner${i}` as LayerRef)
    if (
      "layer" in element &&
      typeof element.layer === "string" &&
      /^(top|bottom|inner\d+)$/.test(element.layer)
    )
      layers.add(element.layer as LayerRef)
    if ("layers" in element && Array.isArray(element.layers))
      for (const layer of element.layers)
        if (/^(top|bottom|inner\d+)$/.test(layer)) layers.add(layer as LayerRef)
    if (element.type === "pcb_trace")
      for (const point of element.route)
        if (point.route_type === "wire") layers.add(point.layer)
  }
  const front = ctx.layer ?? "top"
  const rank = (layer: string) =>
    layer === front
      ? 100
      : layer === "bottom"
        ? 0
        : layer === "top"
          ? 50
          : 40 - Number(layer.slice(5))
  const orderedLayers = [...layers].sort((a, b) => rank(a) - rank(b))
  const baseContext: PcbContext = {
    ...ctx,
    showSolderMask: false,
    showSolderPaste: false,
    showPinNumbers: false,
    showAnchorOffsets: false,
  }
  const background: SvgObject[] = []
  const foreground: SvgObject[] = []
  const selectedDrills: SvgObject[] = []
  const defs: SvgObject[] = []
  for (const layer of orderedLayers) {
    const context: PcbContext = {
      ...baseContext,
      layer,
      // Existing via geometry uses top copper unless soldermask is enabled.
      colorMap: {
        ...ctx.colorMap,
        copper: { ...ctx.colorMap.copper, top: ctx.colorMap.copper[layer]! },
      },
    }
    const ordinary: SvgObject[] = []
    const inspected: SvgObject[] = []
    const holes: SvgObject[] = []
    for (const element of circuitJson) {
      if (element.type === "pcb_hole" || element.type === "pcb_cutout") {
        holes.push(...create(element, context).map(blacken))
        continue
      }
      if (!copperTypes.has(element.type)) continue
      if ("layer" in element && element.layer !== layer) continue
      if (
        (element.type === "pcb_via" || element.type === "pcb_plated_hole") &&
        !element.layers.includes(layer)
      )
        continue
      const input =
        element.type === "pcb_plated_hole"
          ? { ...element, layers: [layer] }
          : element
      const objects = create(input, context).map(opaque)
      const drills = selectGeometry(objects, true)
      holes.push(...drills.map(blacken))
      ordinary.push(...selectGeometry(objects, false))
      if (selected.has(id(element))) {
        inspected.push(...selectGeometry(objects, false))
        // A drill may occur on several layers. Draw its original color once.
        if (
          layer ===
          orderedLayers
            .filter(
              (candidate) =>
                !("layers" in element) ||
                !Array.isArray(element.layers) ||
                element.layers.includes(candidate),
            )
            .at(-1)
        )
          selectedDrills.push(...drills)
      }
    }
    const maskId = `xray-holes-${layer}`
    defs.push({
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
          children: [],
          attributes: {
            x: "0",
            y: "0",
            width: String(width),
            height: String(height),
            fill: "white",
          },
        },
        ...holes,
      ],
    })
    const attrs = { "data-pcb-layer": layer, mask: `url(#${maskId})` }
    background.push(
      group({ ...attrs, opacity: String(hiddenOpacity) }, ordinary),
    )
    foreground.push(group(attrs, inspected))
  }
  return [
    {
      name: "defs",
      type: "element",
      value: "",
      attributes: {},
      children: defs,
    },
    group({ "data-x-ray": "background" }, background),
    group({ "data-x-ray": "selected" }, foreground),
    group({ "data-x-ray": "drills" }, selectedDrills),
  ]
}
