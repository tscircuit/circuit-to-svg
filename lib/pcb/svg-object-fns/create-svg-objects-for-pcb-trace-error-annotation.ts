import type { SvgObject } from "../../svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export interface PcbErrorReferencePoint {
  x: number
  y: number
  dataErrorReference?: "obstacle" | "trace-start" | "trace-end"
}

interface CreatePcbTraceErrorAnnotationParams {
  ctx: PcbContext
  start: PcbErrorReferencePoint
  end: PcbErrorReferencePoint
  additionalReferences?: PcbErrorReferencePoint[]
  message: string
  errorType: string
}

function annotateErrorObject(object: SvgObject, errorType: string): SvgObject {
  return {
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": object.attributes?.["data-type"] ?? errorType,
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
  }
}

function createReferenceLine(
  from: PcbErrorReferencePoint,
  to: PcbErrorReferencePoint,
): SvgObject {
  return {
    name: "line",
    type: "element",
    attributes: {
      x1: from.x.toString(),
      y1: from.y.toString(),
      x2: to.x.toString(),
      y2: to.y.toString(),
      stroke: "red",
      "stroke-width": "1.5",
      "stroke-dasharray": "2,2",
      ...(from.dataErrorReference
        ? { "data-error-reference": from.dataErrorReference }
        : {}),
    },
    children: [],
    value: "",
  }
}

export function createSvgObjectsForPcbTraceErrorAnnotation({
  ctx,
  start,
  end,
  additionalReferences = [],
  message,
  errorType,
}: CreatePcbTraceErrorAnnotationParams): SvgObject[] {
  const screenStart = applyToPoint(ctx.transform, start)
  const screenEnd = applyToPoint(ctx.transform, end)
  const screenCenter = {
    x: (screenStart.x + screenEnd.x) / 2,
    y: (screenStart.y + screenEnd.y) / 2,
  }

  if (
    !Number.isFinite(screenStart.x) ||
    !Number.isFinite(screenStart.y) ||
    !Number.isFinite(screenEnd.x) ||
    !Number.isFinite(screenEnd.y) ||
    !Number.isFinite(screenCenter.x) ||
    !Number.isFinite(screenCenter.y)
  ) {
    return []
  }

  const screenAdditionalReferences = additionalReferences.map((reference) => {
    const point = applyToPoint(ctx.transform, reference)
    return { ...point, dataErrorReference: reference.dataErrorReference }
  })

  const objects: SvgObject[] = [
    createReferenceLine(
      { ...screenStart, dataErrorReference: start.dataErrorReference },
      screenCenter,
    ),
    createReferenceLine(
      { ...screenCenter, dataErrorReference: end.dataErrorReference },
      screenEnd,
    ),
    ...screenAdditionalReferences.map((reference) =>
      createReferenceLine(reference, screenCenter),
    ),
    {
      name: "rect",
      type: "element",
      attributes: {
        x: (screenCenter.x - 5).toString(),
        y: (screenCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenCenter.x} ${screenCenter.y})`,
      },
      children: [],
      value: "",
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: screenCenter.x.toString(),
        y: (screenCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          value: message,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    },
  ]

  return objects.map((object) => annotateErrorObject(object, errorType))
}
