import type { SchematicPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { symbols } from "schematic-symbols"
import {
  applyToPoint,
  compose,
  translate,
  type Matrix,
} from "transformation-matrix"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"

export const createSvgObjectsForNotConnectedSymbol = ({
  schPort,
  transform,
  colorMap,
}: {
  schPort: SchematicPort
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  if (schPort.is_connected !== false) return []

  const direction =
    schPort.facing_direction ?? schPort.side_of_component ?? "right"
  const symbolName = `not_connected_${direction}` as keyof typeof symbols
  const symbol = symbols[symbolName]
  if (!symbol) return []

  const port = symbol.ports[0]
  const symbolToReal = translate(
    schPort.center.x - port.x,
    schPort.center.y - port.y,
  )

  const svgObjects: SvgObject[] = []
  const paths = symbol.primitives.filter((p) => p.type === "path")
  const circles = symbol.primitives.filter((p) => p.type === "circle")

  for (const path of paths) {
    const d =
      path.points
        .map((p, i) => {
          const { x, y } = applyToPoint(compose(transform, symbolToReal), p)
          return `${i === 0 ? "M" : "L"} ${x} ${y}`
        })
        .join(" ") + (path.closed ? " Z" : "")
    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d,
        stroke: colorMap.schematic.component_outline,
        fill: path.fill ? colorMap.schematic.component_outline : "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
  }

  for (const circle of circles) {
    const { x, y } = applyToPoint(compose(transform, symbolToReal), circle)
    const r = Math.abs(circle.radius * transform.a)
    svgObjects.push({
      name: "circle",
      type: "element",
      attributes: {
        cx: x.toString(),
        cy: y.toString(),
        r: r.toString(),
        fill: circle.fill ? colorMap.schematic.component_outline : "none",
        stroke: colorMap.schematic.component_outline,
        "stroke-width": `${getSchStrokeSize(transform)}px`,
      },
      value: "",
      children: [],
    })
  }

  return svgObjects
}
