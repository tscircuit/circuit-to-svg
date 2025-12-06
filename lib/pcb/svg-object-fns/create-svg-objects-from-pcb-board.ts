import type { PcbBoard, PcbPanel, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createAnchorOffsetIndicators } from "../../utils/create-pcb-component-anchor-offset-indicators"

export function createSvgObjectsFromPcbBoard(
  pcbBoard: PcbBoard,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, showSolderMask, circuitJson } = ctx
  const { width, height, center, outline } = pcbBoard

  let path: string
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline
      .map((point: Point, index: number) => {
        const [x, y] = applyToPoint(transform, [
          center.x + point.x,
          center.y + point.y,
        ])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
  } else {
    const halfWidth = width! / 2
    const halfHeight = height! / 2

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

    path =
      `M ${topLeft[0]} ${topLeft[1]} ` +
      `L ${topRight[0]} ${topRight[1]} ` +
      `L ${bottomRight[0]} ${bottomRight[1]} ` +
      `L ${bottomLeft[0]} ${bottomLeft[1]}`
  }

  path += " Z"

  const svgObjects: SvgObject[] = []

  // Add solder mask layer covering the entire board if showSolderMask is enabled
  if (showSolderMask) {
    // Base board mask uses soldermask layer names (different from cutouts/overlays)
    const layer = ctx.layer ?? "top"
    const maskLayer =
      layer === "bottom" ? "soldermask-bottom" : "soldermask-top"
    svgObjects.push({
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-board-soldermask",
        d: path,
        fill: colorMap.soldermask.top,
        "fill-opacity": "0.8",
        stroke: "none",
        "data-type": "pcb_soldermask",
        "data-pcb-layer": maskLayer,
      },
    })
  }

  svgObjects.push({
    name: "path",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-board",
      d: path,
      fill: "none",
      stroke: colorMap.boardOutline,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      "data-type": "pcb_board",
      "data-pcb-layer": "board",
    },
  })

  // Add anchor offset indicators if there's a panel and showAnchorOffsets is enabled
  if (ctx.showAnchorOffsets && circuitJson) {
    const panel = circuitJson.find(
      (elm): elm is PcbPanel => elm.type === "pcb_panel",
    )

    if (panel) {
      const panelCenter = panel.center ?? { x: 0, y: 0 }
      svgObjects.push(
        ...createAnchorOffsetIndicators({
          groupAnchorPosition: panelCenter,
          componentPosition: center,
          transform,
          componentWidth: width,
          componentHeight: height,
        }),
      )
    }
  }

  return svgObjects
}
