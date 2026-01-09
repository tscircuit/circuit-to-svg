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
const KEEPOUT_BACKGROUND_OPACITY = 0.2

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

export function createKeepoutPatternDefs(
  keepoutColor: string = "#FF6B6B",
): SvgObject {
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

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result || !result[1] || !result[2] || !result[3]) {
    return `rgba(255, 0, 0, ${opacity})`
  }
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
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
  keepout: PCBKeepoutRect | PCBKeepoutCircle,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx

  // Filter by layer if layerFilter is set
  if (layerFilter && !keepout.layers.includes(layerFilter)) {
    return []
  }

  const svgObjects: SvgObject[] = []
  const keepoutColor = colorMap.keepout ?? "#FF6B6B"
  const backgroundColor = hexToRgba(keepoutColor, KEEPOUT_BACKGROUND_OPACITY)

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
        fill: backgroundColor,
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
        fill: backgroundColor,
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
