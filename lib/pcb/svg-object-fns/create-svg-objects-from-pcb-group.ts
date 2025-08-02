import type { AnyCircuitElement, PcbGroup, SourceGroup } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbGroup(
  pcbGroup: PcbGroup,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const sourceGroup = circuitJson.find(
    (elm): elm is SourceGroup =>
      elm.type === "source_group" &&
      elm.source_group_id === pcbGroup.source_group_id,
  )

  const label = `${sourceGroup?.name ?? ""}:${pcbGroup.layout_mode ?? ""}`

  const halfWidth = pcbGroup.width / 2
  const halfHeight = pcbGroup.height / 2
  const [x1, y1] = applyToPoint(transform, [
    pcbGroup.center.x - halfWidth,
    pcbGroup.center.y - halfHeight,
  ])
  const [x2, y2] = applyToPoint(transform, [
    pcbGroup.center.x + halfWidth,
    pcbGroup.center.y + halfHeight,
  ])

  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  const scale = Math.abs(transform.a)
  const strokeWidth = 0.2 * scale
  const offset = 0.2 * scale

  return [
    {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        x: x.toString(),
        y: y.toString(),
        width: width.toString(),
        height: height.toString(),
        fill: "none",
        stroke: "#ff0",
        "stroke-width": strokeWidth.toString(),
      },
    },
    {
      name: "text",
      type: "element",
      value: label,
      children: [],
      attributes: {
        x: (x + offset).toString(),
        y: (y + offset).toString(),
        fill: "#fff",
        "font-size": scale.toString(),
        "text-anchor": "start",
        "dominant-baseline": "text-before-edge",
      },
    },
  ]
}
