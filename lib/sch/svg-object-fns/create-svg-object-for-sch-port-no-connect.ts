import type { SchematicPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

/** Draw an X centered on the board-space schematic port (mm, +Y up). */
export const createSvgObjectForSchPortNoConnect = ({
  schPort,
  transform,
  colorMap,
}: {
  schPort: SchematicPort
  transform: Matrix
  colorMap: ColorMap
}): SvgObject => {
  const halfSize = 0.05
  const { x, y } = schPort.center
  const d = [-1, 1]
    .map((slope) => {
      const start = applyToPoint(transform, {
        x: x - halfSize,
        y: y - slope * halfSize,
      })
      const end = applyToPoint(transform, {
        x: x + halfSize,
        y: y + slope * halfSize,
      })
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    })
    .join(" ")

  return {
    name: "path",
    type: "element",
    value: "",
    attributes: {
      class: "sch-port-no-connect",
      "data-schematic-port-id": schPort.schematic_port_id,
      "data-source-port-id": schPort.source_port_id,
      d,
      fill: "none",
      stroke: colorMap.schematic.no_connect,
      "stroke-width": `${getSchStrokeSize(transform)}px`,
      "stroke-linecap": "round",
    },
    children: [],
  }
}
