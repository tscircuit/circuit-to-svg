import type { PCBKeepoutRect, PCBKeepoutCircle, Point } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import {
  applyToPoint,
  compose,
  translate,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const KEEPOUT_PATTERN_ID = "pcb-keepout-pattern"
const KEEPOUT_PATTERN_SIZE = 20
const KEEPOUT_LINE_SPACING = 5
const KEEPOUT_BACKGROUND_COLOR = "rgba(255, 107, 107, 0.2)"

// Replace this local type with PcbKeepoutRing once circuit-json publishes it.
export interface PcbKeepoutRing {
  type: "pcb_keepout"
  shape: "ring"
  pcb_keepout_id: string
  center: Point
  inner_radius: number
  outer_radius: number
  layers: string[]
  description?: string
}

function createKeepoutPatternLines(keepoutColor: string): SvgObject[] {
  const patternLines: SvgObject[] = []
  for (
    let i = -KEEPOUT_PATTERN_SIZE;
    i <= KEEPOUT_PATTERN_SIZE;
    i += KEEPOUT_LINE_SPACING
  ) {
    patternLines.push({
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: i.toString(),
        y1: "0",
        x2: (i + KEEPOUT_PATTERN_SIZE).toString(),
        y2: KEEPOUT_PATTERN_SIZE.toString(),
        stroke: keepoutColor,
        "stroke-width": "1",
      },
      children: [],
    })
  }
  return patternLines
}

export function createKeepoutPatternDefs(keepoutColor: string): SvgObject {
  return {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "pattern",
        type: "element",
        value: "",
        attributes: {
          id: KEEPOUT_PATTERN_ID,
          width: KEEPOUT_PATTERN_SIZE.toString(),
          height: KEEPOUT_PATTERN_SIZE.toString(),
          patternUnits: "userSpaceOnUse",
        },
        children: createKeepoutPatternLines(keepoutColor),
      },
    ],
  }
}

function createKeepoutBaseAttributes(
  keepoutId: string,
  layer: string,
  shapeClass: string,
  description: string | undefined,
): { [key: string]: string } {
  const attributes: { [key: string]: string } = {
    class: `pcb-keepout ${shapeClass} pcb-keepout-background`,
    "data-type": "pcb_keepout",
    "data-pcb-layer": layer,
    "data-pcb-keepout-id": keepoutId,
    stroke: "none",
  }

  if (description) {
    attributes["data-description"] = description
  }

  return attributes
}

function createKeepoutPatternAttributes(
  keepoutId: string,
  layer: string,
  shapeClass: string,
  description: string | undefined,
): { [key: string]: string } {
  const attributes: { [key: string]: string } = {
    class: `pcb-keepout ${shapeClass} pcb-keepout-pattern`,
    fill: `url(#${KEEPOUT_PATTERN_ID})`,
    "data-type": "pcb_keepout",
    "data-pcb-layer": layer,
    "data-pcb-keepout-id": keepoutId,
    stroke: "none",
  }

  if (description) {
    attributes["data-description"] = description
  }

  return attributes
}

export function createSvgObjectsFromPcbKeepout(
  keepout: PCBKeepoutRect | PCBKeepoutCircle | PcbKeepoutRing,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx

  // Filter by layer if layerFilter is set
  if (layerFilter && !keepout.layers.includes(layerFilter)) {
    return []
  }

  const svgObjects: SvgObject[] = []
  const keepoutColor = colorMap.keepout

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
      const baseTransform = matrixToString(compose(translate(cx, cy)))

      const backgroundAttributes = {
        ...createKeepoutBaseAttributes(
          rectKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-rect",
          rectKeepout.description,
        ),
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: KEEPOUT_BACKGROUND_COLOR,
        transform: baseTransform,
      }

      const patternAttributes = {
        ...createKeepoutPatternAttributes(
          rectKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-rect",
          rectKeepout.description,
        ),
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        transform: baseTransform,
      }

      svgObjects.push(
        {
          name: "rect",
          type: "element",
          attributes: backgroundAttributes,
          children: [],
          value: "",
        },
        {
          name: "rect",
          type: "element",
          attributes: patternAttributes,
          children: [],
          value: "",
        },
      )
    } else if (keepout.shape === "ring") {
      const [cx, cy] = applyToPoint(transform, [
        keepout.center.x,
        keepout.center.y,
      ])
      const outerRadius = keepout.outer_radius * Math.abs(transform.a)
      const innerRadius = keepout.inner_radius * Math.abs(transform.a)
      // Two closed subpaths plus evenodd fill leave the center transparent.
      const circlePath = (radius: number) =>
        `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} Z`
      const d = `${circlePath(outerRadius)} ${circlePath(innerRadius)}`

      svgObjects.push(
        {
          name: "path",
          type: "element",
          attributes: {
            ...createKeepoutBaseAttributes(
              keepout.pcb_keepout_id,
              layer,
              "pcb-keepout-ring",
              keepout.description,
            ),
            d,
            "fill-rule": "evenodd",
            fill: KEEPOUT_BACKGROUND_COLOR,
          },
          children: [],
          value: "",
        },
        {
          name: "path",
          type: "element",
          attributes: {
            ...createKeepoutPatternAttributes(
              keepout.pcb_keepout_id,
              layer,
              "pcb-keepout-ring",
              keepout.description,
            ),
            d,
            "fill-rule": "evenodd",
          },
          children: [],
          value: "",
        },
      )
    } else if (keepout.shape === "circle") {
      const circleKeepout = keepout as PCBKeepoutCircle
      const [cx, cy] = applyToPoint(transform, [
        circleKeepout.center.x,
        circleKeepout.center.y,
      ])
      const scaledRadius = circleKeepout.radius * Math.abs(transform.a)

      const backgroundAttributes = {
        ...createKeepoutBaseAttributes(
          circleKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-circle",
          circleKeepout.description,
        ),
        cx: cx.toString(),
        cy: cy.toString(),
        r: scaledRadius.toString(),
        fill: KEEPOUT_BACKGROUND_COLOR,
      }

      const patternAttributes = {
        ...createKeepoutPatternAttributes(
          circleKeepout.pcb_keepout_id,
          layer,
          "pcb-keepout-circle",
          circleKeepout.description,
        ),
        cx: cx.toString(),
        cy: cy.toString(),
        r: scaledRadius.toString(),
      }

      svgObjects.push(
        {
          name: "circle",
          type: "element",
          attributes: backgroundAttributes,
          children: [],
          value: "",
        },
        {
          name: "circle",
          type: "element",
          attributes: patternAttributes,
          children: [],
          value: "",
        },
      )
    }
  }

  return svgObjects
}
