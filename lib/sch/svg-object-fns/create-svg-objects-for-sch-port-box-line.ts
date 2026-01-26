import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { su } from "@tscircuit/circuit-json-util"
import { isSourcePortConnected } from "lib/utils/is-source-port-connected"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { colorMap } from "lib/utils/colors"

const PIN_CIRCLE_RADIUS_MM = 0.02

const createArrow = (
  tip: { x: number; y: number },
  angle: number,
  size: number,
  color: string,
  strokeWidth: number,
): SvgObject => {
  const arrowAngle = Math.PI / 6 // 30 degrees
  const p1 = {
    x: tip.x - size * Math.cos(angle - arrowAngle),
    y: tip.y - size * Math.sin(angle - arrowAngle),
  }
  const p2 = {
    x: tip.x - size * Math.cos(angle + arrowAngle),
    y: tip.y - size * Math.sin(angle + arrowAngle),
  }

  return {
    name: "polygon",
    type: "element",
    attributes: {
      points: `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`,
      fill: "white",
      stroke: color,
      "stroke-width": `${strokeWidth}px`,
    },
    value: "",
    children: [],
  }
}

/**
 * The schematic port box line is the line and circle that goes from the edge
 * of the component box to the port.
 */
export const createSvgObjectsForSchPortBoxLine = ({
  schPort,
  schComponent,
  transform,
  circuitJson,
}: {
  schPort: SchematicPort
  schComponent: SchematicComponent
  transform: Matrix
  circuitJson: AnyCircuitElement[]
}): SvgObject[] => {
  const svgObjects: SvgObject[] = []

  const srcPort = su(circuitJson as any).source_port.get(schPort.source_port_id)

  const realEdgePos = {
    x: schPort.center.x,
    y: schPort.center.y,
  }

  // schPort.distance_from_component_edge is currently calculated incorrectly
  // in core
  const realPinLineLength = schPort.distance_from_component_edge ?? 0.4

  switch (schPort.side_of_component) {
    case "left":
      realEdgePos.x += realPinLineLength
      break
    case "right":
      realEdgePos.x -= realPinLineLength
      break
    case "top":
      realEdgePos.y -= realPinLineLength
      break
    case "bottom":
      realEdgePos.y += realPinLineLength
      break
  }

  const screenSchPortPos = applyToPoint(transform, schPort.center)
  const screenRealEdgePos = applyToPoint(transform, realEdgePos)

  const isConnected = isSourcePortConnected(circuitJson, schPort.source_port_id)

  const is_drawn_with_inversion_circle =
    schPort.is_drawn_with_inversion_circle ?? false
  const BUBBLE_RADIUS_MM = 0.06

  // For connected pins, line goes to center. For unconnected pins, stop short by circle radius
  const realLineEnd = { ...schPort.center }

  if (!isConnected) {
    // Subtract the pin circle radius from the pin line length for unconnected pins
    switch (schPort.side_of_component) {
      case "left":
        realLineEnd.x += PIN_CIRCLE_RADIUS_MM
        break
      case "right":
        realLineEnd.x -= PIN_CIRCLE_RADIUS_MM
        break
      case "top":
        realLineEnd.y -= PIN_CIRCLE_RADIUS_MM
        break
      case "bottom":
        realLineEnd.y += PIN_CIRCLE_RADIUS_MM
        break
    }
  }

  const screenLineEnd = applyToPoint(transform, realLineEnd)

  if (is_drawn_with_inversion_circle) {
    const bubbleRadiusPx = Math.abs(transform.a) * BUBBLE_RADIUS_MM
    const bubbleCenter = { ...screenRealEdgePos }

    switch (schPort.side_of_component) {
      case "left":
        bubbleCenter.x -= bubbleRadiusPx
        screenRealEdgePos.x -= bubbleRadiusPx * 2
        break
      case "right":
        bubbleCenter.x += bubbleRadiusPx
        screenRealEdgePos.x += bubbleRadiusPx * 2
        break
      case "top":
        bubbleCenter.y -= bubbleRadiusPx
        screenRealEdgePos.y -= bubbleRadiusPx * 2
        break
      case "bottom":
        bubbleCenter.y += bubbleRadiusPx
        screenRealEdgePos.y += bubbleRadiusPx * 2
        break
    }

    svgObjects.push({
      name: "circle",
      type: "element",
      attributes: {
        class: "component-pin",
        cx: bubbleCenter.x.toString(),
        cy: bubbleCenter.y.toString(),
        r: bubbleRadiusPx.toString(),
        fill: "white",
        stroke: colorMap.schematic.component_outline,
        "stroke-width": `${getSchStrokeSize(transform)}px`,
      },
      value: "",
      children: [],
    })
  }

  // Add port line
  svgObjects.push({
    name: "line",
    type: "element",
    attributes: {
      class: "component-pin",
      x1: screenRealEdgePos.x.toString(),
      y1: screenRealEdgePos.y.toString(),
      x2: screenLineEnd.x.toString(),
      y2: screenLineEnd.y.toString(),
      "stroke-width": `${getSchStrokeSize(transform)}px`,
    },
    value: "",
    children: [],
  })
  const pinRadiusPx = Math.abs(transform.a) * PIN_CIRCLE_RADIUS_MM

  const pinChildren: SvgObject[] = []

  if (!isConnected) {
    pinChildren.push({
      name: "circle",
      type: "element",
      attributes: {
        class: "component-pin",
        cx: screenSchPortPos.x.toString(),
        cy: screenSchPortPos.y.toString(),
        r: pinRadiusPx.toString(),
        "stroke-width": `${getSchStrokeSize(transform)}px`,
      },
      value: "",
      children: [],
    })
  }

  pinChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      x: (screenSchPortPos.x - pinRadiusPx).toString(),
      y: (screenSchPortPos.y - pinRadiusPx).toString(),
      width: (pinRadiusPx * 2).toString(),
      height: (pinRadiusPx * 2).toString(),
      opacity: "0",
    },
    value: "",
    children: [],
  })

  svgObjects.push({
    name: "g",
    type: "element",
    value: "",
    attributes: {
      "data-schematic-port-id": schPort.source_port_id,
    },
    children: pinChildren,
  })

  const { has_input_arrow, has_output_arrow } = schPort as any

  if ((has_input_arrow || has_output_arrow) && schPort.side_of_component) {
    const arrowSize = Math.abs(transform.a) * 0.1
    const arrowColor = colorMap.schematic.component_outline
    const arrowAxialLength = arrowSize * Math.cos(Math.PI / 6)
    const strokeWidth = getSchStrokeSize(transform) / 3

    let inputAngleRads: number = 0
    let outputAngleRads: number = 0

    if (schPort.side_of_component === "left") {
      inputAngleRads = 0
      outputAngleRads = Math.PI
    } else if (schPort.side_of_component === "right") {
      inputAngleRads = Math.PI
      outputAngleRads = 0
    } else if (schPort.side_of_component === "top") {
      inputAngleRads = Math.PI / 2
      outputAngleRads = -Math.PI / 2
    } else if (schPort.side_of_component === "bottom") {
      inputAngleRads = -Math.PI / 2
      outputAngleRads = Math.PI / 2
    }

    const both = has_input_arrow && has_output_arrow
    let inputArrowTip = { ...screenRealEdgePos }
    let outputArrowBase = { ...screenRealEdgePos }

    if (both) {
      const offset = arrowAxialLength
      if (schPort.side_of_component === "left") {
        outputArrowBase.x -= offset
      } else if (schPort.side_of_component === "right") {
        outputArrowBase.x += offset
      } else if (schPort.side_of_component === "top") {
        outputArrowBase.y -= offset
      } else if (schPort.side_of_component === "bottom") {
        outputArrowBase.y += offset
      }
    }

    if (has_input_arrow) {
      svgObjects.push(
        createArrow(
          inputArrowTip,
          inputAngleRads,
          arrowSize,
          arrowColor,
          strokeWidth,
        ),
      )
    }
    if (has_output_arrow) {
      const outputArrowTip = {
        x: outputArrowBase.x + arrowSize * Math.cos(outputAngleRads),
        y: outputArrowBase.y + arrowSize * Math.sin(outputAngleRads),
      }
      svgObjects.push(
        createArrow(
          outputArrowTip,
          outputAngleRads,
          arrowSize,
          arrowColor,
          strokeWidth,
        ),
      )
    }
  }

  return svgObjects
}
