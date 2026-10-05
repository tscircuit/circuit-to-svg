import type { SchematicPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { applyToPoint, type Matrix } from "transformation-matrix"

const BUBBLE_RADIUS_MM = 0.06

/**
 * Inversion bubble rendering for components that draw no box body.
 *
 * Components with `is_box_with_pins === false` and no `symbol_name` carry
 * their body as owned schematic primitives (typically imported from another
 * tool) rather than a rectangle, so the box and symbol renderers cannot draw
 * their ports. Previously these components rendered no inversion bubbles at
 * all, so `schematic_port.is_drawn_with_inversion_circle` had no visible
 * effect for them.
 */
export const createSvgObjectsForSchPortOnNonBox = ({
  schPort,
  transform,
  colorMap,
}: {
  schPort: SchematicPort
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  if (!schPort.is_drawn_with_inversion_circle) return svgObjects

  const side = schPort.side_of_component

  // The bubble sits on the body edge, at the inner end of the stem that core
  // already drew, using the same distance convention and radius as the box
  // renderer.
  const edgeDistance = schPort.distance_from_component_edge ?? 0.4
  const realBubbleCenter = { ...schPort.center }
  if (side === "left") realBubbleCenter.x += edgeDistance
  else if (side === "right") realBubbleCenter.x -= edgeDistance
  else if (side === "top") realBubbleCenter.y -= edgeDistance
  else if (side === "bottom") realBubbleCenter.y += edgeDistance

  const screenBubbleCenter = applyToPoint(transform, realBubbleCenter)
  const bubbleRadiusPx = Math.abs(transform.a) * BUBBLE_RADIUS_MM

  switch (side) {
    case "left":
      screenBubbleCenter.x -= bubbleRadiusPx
      break
    case "right":
      screenBubbleCenter.x += bubbleRadiusPx
      break
    case "top":
      screenBubbleCenter.y -= bubbleRadiusPx
      break
    case "bottom":
      screenBubbleCenter.y += bubbleRadiusPx
      break
  }

  svgObjects.push({
    name: "circle",
    type: "element",
    attributes: {
      class: "component-pin sch-component-pin sch-inversion-bubble",
      cx: screenBubbleCenter.x.toString(),
      cy: screenBubbleCenter.y.toString(),
      r: bubbleRadiusPx.toString(),
      fill: "white",
      stroke: colorMap.schematic.component_outline,
      "stroke-width": `${Math.abs(transform.a) * 0.02}px`,
    },
    value: "",
    children: [],
  })

  return svgObjects
}
