import type { SchematicDebugObject } from "circuit-json"
import type { INode as SvgObject } from "svgson"

export function createSvgObjectsFromSchDebugObject(
  debugObject: SchematicDebugObject,
): SvgObject[] {
  if (debugObject.shape === "rect") {
    return [{
      name: "rect",
      type: "element",
      attributes: {
        x: (debugObject.center.x - debugObject.size.width / 2).toString(),
        y: (debugObject.center.y - debugObject.size.height / 2).toString(),
        width: debugObject.size.width.toString(),
        height: debugObject.size.height.toString(),
        fill: "none",
        stroke: "red",
        "stroke-width": "0.02",
        "stroke-dasharray": "0.1,0.1"
      },
      children: debugObject.label ? [{
        name: "text",
        type: "element",
        attributes: {
          x: debugObject.center.x.toString(),
          y: (debugObject.center.y - debugObject.size.height / 2 - 0.1).toString(),
          "text-anchor": "middle",
          "font-size": "0.2",
          fill: "red"
        },
        children: [{
          type: "text",
          value: debugObject.label
        }]
      }] : []
    }]
  }
  
  if (debugObject.shape === "line") {
    return [{
      name: "line",
      type: "element", 
      attributes: {
        x1: debugObject.start.x.toString(),
        y1: debugObject.start.y.toString(),
        x2: debugObject.end.x.toString(),
        y2: debugObject.end.y.toString(),
        stroke: "red",
        "stroke-width": "0.02",
        "stroke-dasharray": "0.1,0.1"
      },
      children: debugObject.label ? [{
        name: "text",
        type: "element",
        attributes: {
          x: ((debugObject.start.x + debugObject.end.x) / 2).toString(),
          y: ((debugObject.start.y + debugObject.end.y) / 2 - 0.1).toString(),
          "text-anchor": "middle",
          "font-size": "0.2",
          fill: "red"
        },
        children: [{
          type: "text",
          value: debugObject.label
        }]
      }] : []
    }]
  }

  return []
}
