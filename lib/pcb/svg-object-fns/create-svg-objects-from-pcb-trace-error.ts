import type {
  PcbTraceError,
  PcbPort,
  PcbTrace,
  AnyCircuitElement,
} from "circuit-json"
import type { SvgObject } from "../../../lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

function isTraceErrorVisibleOnLayer(
  pcbTraceError: PcbTraceError,
  circuitJson: AnyCircuitElement[],
  port1: PcbPort | undefined,
  port2: PcbPort | undefined,
  via: { layers?: string[] } | undefined,
  layerFilter: string | undefined,
): boolean {
  if (!layerFilter) return true

  const trace = circuitJson.find(
    (el): el is PcbTrace =>
      el.type === "pcb_trace" && el.pcb_trace_id === pcbTraceError.pcb_trace_id,
  )

  const referencedLayers = new Set<string>()
  for (const layer of port1?.layers ?? []) referencedLayers.add(layer)
  for (const layer of port2?.layers ?? []) referencedLayers.add(layer)
  for (const layer of via?.layers ?? []) referencedLayers.add(layer)
  for (const routePoint of trace?.route ?? []) {
    if (routePoint.route_type === "via") {
      if (routePoint.from_layer) referencedLayers.add(routePoint.from_layer)
      if (routePoint.to_layer) referencedLayers.add(routePoint.to_layer)
    } else if ("layer" in routePoint && routePoint.layer) {
      referencedLayers.add(routePoint.layer)
    }
  }
  for (const compId of pcbTraceError.pcb_component_ids ?? []) {
    const comp = circuitJson.find(
      (el) => el.type === "pcb_component" && el.pcb_component_id === compId,
    ) as { layer?: string } | undefined
    if (comp?.layer) referencedLayers.add(comp.layer)
  }

  if (referencedLayers.size > 0 && !referencedLayers.has(layerFilter)) {
    return false
  }
  return true
}

export function createSvgObjectsFromPcbTraceError(
  pcbTraceError: PcbTraceError,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { transform, shouldDrawErrors } = ctx
  if (!shouldDrawErrors) return []

  const { pcb_port_ids } = pcbTraceError

  const port1 = circuitJson.find(
    (el): el is PcbPort =>
      el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[0],
  )
  const port2 = circuitJson.find(
    (el): el is PcbPort =>
      el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[1],
  )

  const viaIdMatch = pcbTraceError.message?.match(/pcb_via\[#?(pcb_via_\d+)\]/)
  const viaId = viaIdMatch?.[1]
  const via = circuitJson.find(
    (el) => el.type === "pcb_via" && el.pcb_via_id === viaId,
  ) as { x: number; y: number; type: string; layers?: string[] } | undefined

  if (
    !isTraceErrorVisibleOnLayer(
      pcbTraceError,
      circuitJson,
      port1,
      port2,
      via,
      ctx.layer,
    )
  ) {
    return []
  }

  if (!port1 || !port2) {
    if (via && via.type === "pcb_via") {
      return createSvgObjectsForViaTraceError(pcbTraceError, via, ctx)
    }

    if (pcbTraceError.center) {
      const screenCenter = applyToPoint(transform, {
        x: pcbTraceError.center.x,
        y: pcbTraceError.center.y,
      })
      return annotateTraceErrorSvgObjects([
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
              value: pcbTraceError.message || "Pcb Trace Error",
              name: "",
              attributes: {},
              children: [],
            },
          ],
          value: "",
        },
      ])
    } else return []
  }

  const screenPort1 = applyToPoint(transform, {
    x: port1.x,
    y: port1.y,
  })
  const screenPort2 = applyToPoint(transform, {
    x: port2.x,
    y: port2.y,
  })

  const errorCenter = {
    x: (screenPort1.x + screenPort2.x) / 2,
    y: (screenPort1.y + screenPort2.y) / 2,
  }

  if (
    isNaN(screenPort1.x) ||
    isNaN(screenPort1.y) ||
    isNaN(screenPort2.x) ||
    isNaN(screenPort2.y) ||
    isNaN(errorCenter.x) ||
    isNaN(errorCenter.y)
  ) {
    return []
  }

  const svgObjects: SvgObject[] = [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: screenPort1.x.toString(),
        y1: screenPort1.y.toString(),
        x2: errorCenter.x.toString(),
        y2: errorCenter.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "2,2",
      },
      children: [],
      value: "",
    },
    {
      name: "line",
      type: "element",
      attributes: {
        x1: errorCenter.x.toString(),
        y1: errorCenter.y.toString(),
        x2: screenPort2.x.toString(),
        y2: screenPort2.y.toString(),
        stroke: "red",
        "stroke-width": "1.5",
        "stroke-dasharray": "2,2",
      },
      children: [],
      value: "",
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        x: (errorCenter.x - 5).toString(),
        y: (errorCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${errorCenter.x} ${errorCenter.y})`,
      },
      children: [],
      value: "",
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: errorCenter.x.toString(),
        y: (errorCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          value: pcbTraceError.message || "Pcb Trace Error",
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    },
  ]

  return annotateTraceErrorSvgObjects(svgObjects)
}

function createSvgObjectsForViaTraceError(
  pcbTraceError: PcbTraceError,
  via: { x: number; y: number },
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  if (pcbTraceError.center && via) {
    const screenCenter = applyToPoint(transform, {
      x: pcbTraceError.center.x,
      y: pcbTraceError.center.y,
    })
    const screenVia = applyToPoint(transform, {
      x: via.x,
      y: via.y,
    })

    // Vector from center to via
    const dx = screenVia.x - screenCenter.x
    const dy = screenVia.y - screenCenter.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const margin = 10 // px
    const boxWidth = dist + margin * 2
    const boxHeight = 20 // px, can be adjusted
    const midX = (screenCenter.x + screenVia.x) / 2
    const midY = (screenCenter.y + screenVia.y) / 2

    return annotateTraceErrorSvgObjects([
      // Rotated bounding box
      {
        name: "rect",
        type: "element",
        attributes: {
          x: (midX - boxWidth / 2).toString(),
          y: (midY - boxHeight / 2).toString(),
          width: boxWidth.toString(),
          height: boxHeight.toString(),
          fill: "none",
          stroke: "red",
          "stroke-width": "1",
          "stroke-dasharray": "3,2",
          transform: `rotate(${angle} ${midX} ${midY})`,
        },
        children: [],
        value: "",
      },
      // Error diamond
      {
        name: "rect",
        type: "element",
        attributes: {
          x: (midX - 5).toString(),
          y: (midY - 5).toString(),
          width: "10",
          height: "10",
          fill: "red",
          transform: `rotate(45 ${midX} ${midY})`,
        },
        children: [],
        value: "",
      },
      // Error label
      {
        name: "text",
        type: "element",
        attributes: {
          x: midX.toString(),
          y: (midY - boxHeight / 2 - 5).toString(),
          fill: "red",
          "font-family": "sans-serif",
          "font-size": "12",
          "text-anchor": "middle",
        },
        children: [
          {
            type: "text",
            value: pcbTraceError.message || "Pcb Trace Error",
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
      },
    ])
  }

  return []
}

function annotateTraceErrorSvgObjects(objects: SvgObject[]): SvgObject[] {
  return objects.map((object) => ({
    ...object,
    attributes: {
      ...(object.attributes ?? {}),
      "data-type": object.attributes?.["data-type"] ?? "pcb_trace_error",
      "data-pcb-layer": object.attributes?.["data-pcb-layer"] ?? "overlay",
    },
    children: (object.children ?? []).map((child: any) => {
      if (child?.type === "element") {
        return {
          ...child,
          attributes: {
            ...(child.attributes ?? {}),
            "data-type": child.attributes?.["data-type"] ?? "pcb_trace_error",
            "data-pcb-layer": child.attributes?.["data-pcb-layer"] ?? "overlay",
          },
        }
      }
      return child
    }),
  }))
}
