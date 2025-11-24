import type { PcbPanel } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbPanel(
  pcbPanel: PcbPanel,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, showSolderMask } = ctx
  const width = Number(pcbPanel.width)
  const height = Number(pcbPanel.height)
  const center = pcbPanel.center ?? { x: width / 2, y: height / 2 }

  const halfWidth = width / 2
  const halfHeight = height / 2

  const topLeft = applyToPoint(transform, [
    center.x - halfWidth,
    center.y - halfHeight,
  ])
  const topRight = applyToPoint(transform, [
    center.x + halfWidth,
    center.y - halfHeight,
  ])
  const bottomRight = applyToPoint(transform, [
    center.x + halfWidth,
    center.y + halfHeight,
  ])
  const bottomLeft = applyToPoint(transform, [
    center.x - halfWidth,
    center.y + halfHeight,
  ])

  const path =
    `M ${topLeft[0]} ${topLeft[1]} ` +
    `L ${topRight[0]} ${topRight[1]} ` +
    `L ${bottomRight[0]} ${bottomRight[1]} ` +
    `L ${bottomLeft[0]} ${bottomLeft[1]} Z`

  const isCoveredWithSolderMask = pcbPanel.covered_with_solder_mask !== false
  const shouldShowSolderMask = Boolean(
    showSolderMask && isCoveredWithSolderMask,
  )

  return [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-panel",
        d: path,
        fill: "none",
        stroke: colorMap.boardOutline,
        "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
        "data-type": "pcb_panel",
        "data-pcb-layer": "board",
      },
    },
  ]
}
