import type { SchematicVoltageProbe } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSvgObjectsFromSchVoltageProbe(
  probe: SchematicVoltageProbe,
  transform: Matrix,
): SvgObject[] {
  const [screenX, screenY] = applyToPoint(transform, [
    probe.position.x,
    probe.position.y,
  ])

  const arrowLength = Math.abs(transform.a) * 0.8 // Adjust length
  const arrowWidth = Math.abs(transform.a) * 0.35 // Adjust width

  const arrowPath = [
    `M ${screenX},${screenY}`,
    `L ${screenX + arrowLength * Math.cos((130 * Math.PI) / 180)},${screenY + arrowLength * Math.sin((130 * Math.PI) / 180)}`,
    `M ${screenX + arrowLength * Math.cos((130 * Math.PI) / 180)},${screenY + arrowLength * Math.sin((130 * Math.PI) / 180)}`,
    `L ${screenX + (arrowLength - arrowWidth) * Math.cos(((130 + 10) * Math.PI) / 180)},${screenY + (arrowLength - arrowWidth) * Math.sin(((130 + 10) * Math.PI) / 180)}`,
    `L ${screenX + (arrowLength - arrowWidth) * Math.cos(((130 - 10) * Math.PI) / 180)},${screenY + (arrowLength - arrowWidth) * Math.sin(((130 - 10) * Math.PI) / 180)}`,
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
        "stroke-width": `${getSchStrokeSize(transform) * 1}px`, // Adjust line thickness
        class: "voltage-probe",
      },
      value: "",
      children: [],
    },
  ]
}
