import type { SchematicVoltageProbe } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { type Matrix, applyToPoint } from "transformation-matrix"

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

  const arrowLength = Math.abs(transform.a) * 0.6
  const arrowWidth = Math.abs(transform.a) * 0.28

  const baseX = screenX + arrowLength * Math.cos((-50 * Math.PI) / 180)
  const baseY = screenY + arrowLength * Math.sin((-50 * Math.PI) / 180)

  const tipX = screenX
  const tipY = screenY

  const arrowPath = [
    `M ${baseX},${baseY}`,
    `L ${tipX},${tipY}`,
    `M ${tipX},${tipY}`,
    `L ${tipX - arrowWidth * Math.cos(((-50 + 150) * Math.PI) / 180)},${tipY - arrowWidth * Math.sin(((-50 + 150) * Math.PI) / 180)}`,
    `L ${tipX - arrowWidth * Math.cos(((-50 + 210) * Math.PI) / 180)},${tipY - arrowWidth * Math.sin(((-50 + 210) * Math.PI) / 180)}`,
    "Z",
  ].join(" ")

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: arrowPath,
        stroke: colorMap.schematic.reference,
        fill: colorMap.schematic.reference,
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
        x: (baseX + 8 - (baseX - baseX)).toString(),
        y: (baseY - 10 + (baseY - baseY)).toString(),
        fill: colorMap.schematic.reference,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-family": "sans-serif",
        "font-size": `${getSchScreenFontSize(transform, "reference_designator")}px`,
        "font-weight": "bold",
        "data-schematic-voltage-probe-id": probe.schematic_voltage_probe_id,
      },
      children: [
        {
          type: "text",
          value: probe.voltage ? `${probe.voltage}V` : "",
          name: "",
          attributes: {},
          children: [],
        },
      ],
    },
  ]
}
