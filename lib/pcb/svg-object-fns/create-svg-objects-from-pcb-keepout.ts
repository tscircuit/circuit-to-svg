import type { PCBKeepoutRect, PCBKeepoutCircle, Point } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import {
  applyToPoint,
  compose,
  translate,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbKeepout(
  keepout: PCBKeepoutRect | PCBKeepoutCircle,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx

  // Filter by layer if layerFilter is set
  if (layerFilter && !keepout.layers.includes(layerFilter)) {
    return []
  }

  const svgObjects: SvgObject[] = []

  // Create one SVG object for each layer
  for (const layer of keepout.layers) {
    // Skip if layer filter is set and this layer doesn't match
    if (layerFilter && layer !== layerFilter) {
      continue
    }

    if (keepout.shape === "rect") {
      const rectKeepout = keepout as PCBKeepoutRect
      const [cx, cy] = applyToPoint(transform, [
        rectKeepout.center.x,
        rectKeepout.center.y,
      ])
      const scaledWidth = rectKeepout.width * Math.abs(transform.a)
      const scaledHeight = rectKeepout.height * Math.abs(transform.d)
      const transformedStrokeWidth = 0.1 * Math.abs(transform.a)

      const attributes: { [key: string]: string } = {
        class: "pcb-keepout pcb-keepout-rect",
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: "none",
        stroke: colorMap.keepout ?? "#FF6B6B",
        "stroke-width": transformedStrokeWidth.toString(),
        "stroke-dasharray": `${transformedStrokeWidth * 3} ${transformedStrokeWidth * 2}`,
        transform: matrixToString(compose(translate(cx, cy))),
        "data-type": "pcb_keepout",
        "data-pcb-layer": layer,
        "data-pcb-keepout-id": rectKeepout.pcb_keepout_id,
      }

      if (rectKeepout.description) {
        attributes["data-description"] = rectKeepout.description
      }

      svgObjects.push({
        name: "rect",
        type: "element",
        attributes,
        children: [],
        value: "",
      })
    } else if (keepout.shape === "circle") {
      const circleKeepout = keepout as PCBKeepoutCircle
      const [cx, cy] = applyToPoint(transform, [
        circleKeepout.center.x,
        circleKeepout.center.y,
      ])
      const scaledRadius = circleKeepout.radius * Math.abs(transform.a)
      const transformedStrokeWidth = 0.1 * Math.abs(transform.a)

      const attributes: { [key: string]: string } = {
        class: "pcb-keepout pcb-keepout-circle",
        cx: cx.toString(),
        cy: cy.toString(),
        r: scaledRadius.toString(),
        fill: "none",
        stroke: colorMap.keepout ?? "#FF6B6B",
        "stroke-width": transformedStrokeWidth.toString(),
        "stroke-dasharray": `${transformedStrokeWidth * 3} ${transformedStrokeWidth * 2}`,
        "data-type": "pcb_keepout",
        "data-pcb-layer": layer,
        "data-pcb-keepout-id": circleKeepout.pcb_keepout_id,
      }

      if (circleKeepout.description) {
        attributes["data-description"] = circleKeepout.description
      }

      svgObjects.push({
        name: "circle",
        type: "element",
        attributes,
        children: [],
        value: "",
      })
    }
  }

  return svgObjects
}
