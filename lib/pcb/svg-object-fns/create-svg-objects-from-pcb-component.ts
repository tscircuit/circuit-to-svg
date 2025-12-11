import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import type { SvgObject } from "lib/svg-object"
import { createAnchorOffsetIndicators } from "../../utils/create-pcb-component-anchor-offset-indicators"
import type { PcbComponent } from "circuit-json"

export function createSvgObjectsFromPcbComponent(
  component: PcbComponent,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, circuitJson } = ctx
  const { center, width, height, rotation = 0 } = component
  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`

  const svgObjects: SvgObject[] = []

  // Add anchor offset indicators if this component is positioned relative to a group or board
  if (
    ctx.showAnchorOffsets &&
    circuitJson &&
    (component.positioned_relative_to_pcb_group_id ||
      component.positioned_relative_to_pcb_board_id)
  ) {
    const anchorPosition = getAnchorPosition(component, circuitJson)

    if (anchorPosition) {
      svgObjects.push(
        ...createAnchorOffsetIndicators({
          groupAnchorPosition: anchorPosition,
          componentPosition: center,
          transform,
          componentWidth: width,
          componentHeight: height,
          displayXOffset: component.display_offset_x,
          displayYOffset: component.display_offset_y,
        }),
      )
    }
  }

  if (
    !ctx.colorMap.debugComponent?.fill &&
    !ctx.colorMap.debugComponent?.stroke
  ) {
    return svgObjects
  }

  svgObjects.push({
    name: "g",
    type: "element",
    attributes: {
      transform: transformStr,
      "data-type": "pcb_component",
      "data-pcb-layer": component.layer ?? "top",
    },
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-component",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          fill: ctx.colorMap.debugComponent.fill ?? "transparent",
          stroke: ctx.colorMap.debugComponent.stroke ?? "transparent",
          "data-type": "pcb_component",
          "data-pcb-layer": component.layer ?? "top",
        },
      } as any,
    ],
    value: "",
  })

  return svgObjects
}

function getAnchorPosition(
  component: any,
  circuitJson: any[],
): { x: number; y: number } | undefined {
  if (component.positioned_relative_to_pcb_group_id) {
    const pcbGroup = circuitJson.find(
      (elm) =>
        elm.type === "pcb_group" &&
        elm.pcb_group_id === component.positioned_relative_to_pcb_group_id,
    ) as any

    if (pcbGroup?.center) return pcbGroup.center
  }

  if (component.positioned_relative_to_pcb_board_id) {
    const pcbBoard = circuitJson.find(
      (elm) =>
        elm.type === "pcb_board" &&
        elm.pcb_board_id === component.positioned_relative_to_pcb_board_id,
    ) as any

    if (pcbBoard?.center) return pcbBoard.center
  }

  return undefined
}
