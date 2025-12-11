import type { SchematicVoltageProbe } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchVoltageProbe({
  probe,
  transform,
  colorMap,
}: {
  probe: SchematicVoltageProbe
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const [screenX, screenY] = applyToPoint(transform, [
    probe.position.x,
    probe.position.y,
  ])

  const probeColor = probe.color ?? colorMap.schematic.reference

  const arrowLength = Math.abs(transform.a) * 0.6
  const arrowWidth = Math.abs(transform.a) * 0.28

  const labelAlignment = probe.label_alignment ?? "center_right"

  let baseAngleRad: number
  let textAnchor: "start" | "end" | "middle"
  let textOffsetX: number
  let textOffsetY: number

  switch (labelAlignment) {
    case "top_left":
      baseAngleRad = (-135 * Math.PI) / 180
      textAnchor = "end"
      textOffsetX = -8
      textOffsetY = -8
      break
    case "top_center":
      baseAngleRad = (-90 * Math.PI) / 180
      textAnchor = "middle"
      textOffsetX = 0
      textOffsetY = -8
      break
    case "top_right":
      baseAngleRad = (-45 * Math.PI) / 180
      textAnchor = "start"
      textOffsetX = 8
      textOffsetY = -8
      break
    case "center_left":
      baseAngleRad = (-130 * Math.PI) / 180
      textAnchor = "end"
      textOffsetX = -8
      textOffsetY = 0
      break
    case "center":
      baseAngleRad = (-90 * Math.PI) / 180
      textAnchor = "middle"
      textOffsetX = 0
      textOffsetY = -8
      break
    case "center_right":
      baseAngleRad = (-50 * Math.PI) / 180
      textAnchor = "start"
      textOffsetX = 8
      textOffsetY = 0
      break
    case "bottom_left":
      baseAngleRad = (135 * Math.PI) / 180
      textAnchor = "end"
      textOffsetX = -8
      textOffsetY = 8
      break
    case "bottom_center":
      baseAngleRad = (90 * Math.PI) / 180
      textAnchor = "middle"
      textOffsetX = 0
      textOffsetY = 8
      break
    case "bottom_right":
      baseAngleRad = (45 * Math.PI) / 180
      textAnchor = "start"
      textOffsetX = 8
      textOffsetY = 8
      break
    default:
      baseAngleRad = (-50 * Math.PI) / 180
      textAnchor = "start"
      textOffsetX = 8
      textOffsetY = 0
  }

  const baseX = screenX + arrowLength * Math.cos(baseAngleRad)
  const baseY = screenY + arrowLength * Math.sin(baseAngleRad)

  const tipX = screenX
  const tipY = screenY

  const arrowPath = [
    `M ${baseX},${baseY}`,
    `L ${tipX},${tipY}`,
    `M ${tipX},${tipY}`,
    `L ${tipX - arrowWidth * Math.cos((((baseAngleRad * 180) / Math.PI + 150) * Math.PI) / 180)},${tipY - arrowWidth * Math.sin((((baseAngleRad * 180) / Math.PI + 150) * Math.PI) / 180)}`,
    `L ${tipX - arrowWidth * Math.cos((((baseAngleRad * 180) / Math.PI + 210) * Math.PI) / 180)},${tipY - arrowWidth * Math.sin((((baseAngleRad * 180) / Math.PI + 210) * Math.PI) / 180)}`,
    "Z",
  ].join(" ")

  const x = (baseX + textOffsetX).toString()
  const y = (baseY + textOffsetY).toString()
  const textChildren: SvgObject[] = []

  if (probe.name && probe.voltage !== undefined) {
    textChildren.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        x,
      },
      children: [
        {
          type: "text",
          value: probe.name,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
    textChildren.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        x,
        dy: "1.2em",
      },
      children: [
        {
          type: "text",
          value: `${probe.voltage}V`,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  } else {
    const textParts: string[] = []
    if (probe.name) {
      textParts.push(probe.name)
    }
    if (probe.voltage !== undefined) {
      textParts.push(`${probe.voltage}V`)
    }
    textChildren.push({
      type: "text",
      value: textParts.join(" "),
      name: "",
      attributes: {},
      children: [],
    })
  }

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: arrowPath,
        stroke: probeColor,
        fill: probeColor,
        "stroke-width": `${getSchStrokeSize(transform)}px`,
      },
      value: "",
      children: [],
    },
    {
      type: "element",
      name: "text",
      value: "",
      attributes: {
        x,
        y,
        fill: probeColor,
        "text-anchor": textAnchor,
        "dominant-baseline": "middle",
        "font-family": "sans-serif",
        "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
        "font-weight": "bold",
        "data-schematic-voltage-probe-id": probe.schematic_voltage_probe_id,
      },
      children: textChildren,
    },
  ]
}
