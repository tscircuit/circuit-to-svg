import type { PcbPanel } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbPanel(
  pcbPanel: PcbPanel,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, renderSolderMask } = ctx
  const width = Number(pcbPanel.width)
  const height = Number(pcbPanel.height)

  const topLeft = applyToPoint(transform, [0, 0])
  const topRight = applyToPoint(transform, [width, 0])
  const bottomRight = applyToPoint(transform, [width, height])
  const bottomLeft = applyToPoint(transform, [0, height])

  const path =
    `M ${topLeft[0]} ${topLeft[1]} ` +
    `L ${topRight[0]} ${topRight[1]} ` +
    `L ${bottomRight[0]} ${bottomRight[1]} ` +
    `L ${bottomLeft[0]} ${bottomLeft[1]} Z`

  const isCoveredWithSolderMask = pcbPanel.covered_with_solder_mask !== false
  const shouldRenderSolderMask = Boolean(
    renderSolderMask && isCoveredWithSolderMask,
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
        fill: shouldRenderSolderMask ? colorMap.soldermask.top : "none",
        stroke: colorMap.boardOutline,
        "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
        "data-type": "pcb_panel",
        "data-pcb-layer": "board",
      },
    },
  ]
}
