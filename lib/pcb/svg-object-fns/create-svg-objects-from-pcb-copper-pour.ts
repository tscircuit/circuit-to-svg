import type { PcbCopperPour } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotate,
  toString as matrixToString,
  translate,
} from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { ringToPathD } from "lib/utils/ring-to-path-d"
import { createSoldermaskCutoutElement } from "./create-soldermask-cutout-element"
import { createSoldermaskOverlayElement } from "./create-soldermask-overlay-element"

export function createSvgObjectsFromPcbCopperPour(
  pour: PcbCopperPour,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  const { layer } = pour

  if (layerFilter && layer !== layerFilter) return []

  const color = layerNameToColor(layer, colorMap)
  const opacity = "0.5"
  const isCoveredWithSolderMask = pour.covered_with_solder_mask !== false

  const maskOverlayColor =
    layer === "bottom"
      ? colorMap.soldermaskOverCopper.bottom
      : colorMap.soldermaskOverCopper.top
  const maskOverlayOpacity = "0.9"

  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint(transform, [pour.center.x, pour.center.y])
    const scaledWidth = pour.width * Math.abs(transform.a)
    const scaledHeight = pour.height * Math.abs(transform.d)
    const svgRotation = -(pour.rotation ?? 0)

    const rectAttributes = {
      x: (-scaledWidth / 2).toString(),
      y: (-scaledHeight / 2).toString(),
      width: scaledWidth.toString(),
      height: scaledHeight.toString(),
      transform: matrixToString(
        compose(translate(cx, cy), rotate((svgRotation * Math.PI) / 180)),
      ),
    }

    const copperRect: SvgObject = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-copper-pour pcb-copper-pour-rect",
        ...rectAttributes,
        fill: color,
        "fill-opacity": opacity,
        "data-type": "pcb_copper_pour",
        "data-pcb-layer": layer,
      },
    }

    const maskRect: SvgObject | null = showSolderMask
      ? isCoveredWithSolderMask
        ? createSoldermaskOverlayElement({
            elementType: "rect",
            shapeAttributes: rectAttributes,
            layer,
            fillColor: maskOverlayColor,
            fillOpacity: maskOverlayOpacity,
            className: "pcb-soldermask-covered-pour",
          })
        : createSoldermaskCutoutElement({
            elementType: "rect",
            shapeAttributes: rectAttributes,
            layer,
            colorMap,
          })
      : null

    if (!maskRect) {
      return [copperRect]
    }

    // For uncovered pours, check if this is a "substrate-only" case (no copper visible)
    // This is indicated by the pour ID containing "substrate_only"
    const isSubstrateOnly =
      !isCoveredWithSolderMask &&
      pour.pcb_copper_pour_id?.includes("substrate_only")

    if (isSubstrateOnly) {
      return [maskRect] // Only return the substrate cutout, no copper
    }

    return [copperRect, maskRect]
  }

  if (pour.shape === "polygon") {
    if (!pour.points || pour.points.length === 0) return []

    const transformedPoints = pour.points.map((p) =>
      applyToPoint(transform, [p.x, p.y]),
    )
    const pointsString = transformedPoints
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ")

    const copperPolygon: SvgObject = {
      name: "polygon",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-copper-pour pcb-copper-pour-polygon",
        points: pointsString,
        fill: color,
        "fill-opacity": opacity,
        "data-type": "pcb_copper_pour",
        "data-pcb-layer": layer,
      },
    }

    const maskPolygon: SvgObject | null = showSolderMask
      ? isCoveredWithSolderMask
        ? createSoldermaskOverlayElement({
            elementType: "polygon",
            shapeAttributes: { points: pointsString },
            layer,
            fillColor: maskOverlayColor,
            fillOpacity: maskOverlayOpacity,
            className: "pcb-soldermask-covered-pour",
          })
        : createSoldermaskCutoutElement({
            elementType: "polygon",
            shapeAttributes: { points: pointsString },
            layer,
            colorMap,
          })
      : null

    if (!maskPolygon) {
      return [copperPolygon]
    }

    // For uncovered pours, check if this is a "substrate-only" case (no copper visible)
    const isSubstrateOnly =
      !isCoveredWithSolderMask &&
      pour.pcb_copper_pour_id?.includes("substrate_only")

    if (isSubstrateOnly) {
      return [maskPolygon] // Only return the substrate cutout, no copper
    }

    return [copperPolygon, maskPolygon]
  }

  if (pour.shape === "brep") {
    const { brep_shape } = pour
    let d = ringToPathD(brep_shape.outer_ring.vertices, transform)
    for (const inner_ring of brep_shape.inner_rings ?? []) {
      d += ` ${ringToPathD(inner_ring.vertices, transform)}`
    }

    const copperPath: SvgObject = {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-copper-pour pcb-copper-pour-brep",
        d,
        fill: color,
        "fill-rule": "evenodd",
        "fill-opacity": opacity,
        "data-type": "pcb_copper_pour",
        "data-pcb-layer": layer,
      },
    }

    const maskPath: SvgObject | null = showSolderMask
      ? isCoveredWithSolderMask
        ? createSoldermaskOverlayElement({
            elementType: "path",
            shapeAttributes: { d, "fill-rule": "evenodd" },
            layer,
            fillColor: maskOverlayColor,
            fillOpacity: maskOverlayOpacity,
            className: "pcb-soldermask-covered-pour",
          })
        : createSoldermaskCutoutElement({
            elementType: "path",
            shapeAttributes: { d, "fill-rule": "evenodd" },
            layer,
            colorMap,
          })
      : null

    if (!maskPath) {
      return [copperPath]
    }

    // For uncovered pours, check if this is a "substrate-only" case (no copper visible)
    const isSubstrateOnly =
      !isCoveredWithSolderMask &&
      pour.pcb_copper_pour_id?.includes("substrate_only")

    if (isSubstrateOnly) {
      return [maskPath] // Only return the substrate cutout, no copper
    }

    return [copperPath, maskPath]
  }

  return []
}
