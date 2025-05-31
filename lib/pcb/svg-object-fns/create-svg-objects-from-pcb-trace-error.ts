import type { PcbTraceError, PcbPort, AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "../../../lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../pcb-context"

export function createSvgObjectsFromPcbTraceError({
  error: pcbTraceError,
  soup: circuitJson,
  ctx,
  shouldDrawErrors,
}: {
  error: PcbTraceError
  soup: AnyCircuitElement[]
  ctx: PcbContext
  shouldDrawErrors?: boolean
}): SvgObject[] {
  const { transform } = ctx
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

  if (!port1 || !port2) {
    const viaIdMatch = pcbTraceError.message?.match(
      /pcb_via\[#?(pcb_via_\d+)\]/,
    )
    const viaId = viaIdMatch?.[1]
    const via = circuitJson.find(
      (el) => el.type === "pcb_via" && el.pcb_via_id === viaId,
    ) as { x: number; y: number; type: string } | undefined

    if (via && via.type === "pcb_via") {
      return createSvgObjectsForViaTraceError({
        pcbTraceError,
        via,
        ctx,
      })
    }

    if (pcbTraceError.center) {
      const screenCenter = applyToPoint(transform, {
        x: pcbTraceError.center.x,
        y: pcbTraceError.center.y,
      })
      return [
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
      ]
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

  return svgObjects
}

function createSvgObjectsForViaTraceError({
  pcbTraceError,
  via,
  ctx,
}: {
  pcbTraceError: PcbTraceError
  via: { x: number; y: number }
  ctx: PcbContext
}): SvgObject[] {
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

    return [
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
    ]
  }

  return []
}
