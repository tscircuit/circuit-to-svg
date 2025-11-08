import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import type { SvgObject } from "lib/svg-object"
import { createPcbComponentAnchorOffsetIndicators } from "../../utils/create-pcb-component-anchor-offset-indicators"

export function createSvgObjectsFromPcbComponent(
  component: any,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, circuitJson } = ctx
  const { center, width, height, rotation = 0 } = component
  
  // Calculate the actual position based on position_mode
  let actualPosition = { x: center.x, y: center.y }
  
  // If positioned relative to a group, calculate absolute position
  if (
    component.positioned_relative_to_pcb_group_id &&
    component.position_mode === "relative" &&
    circuitJson
  ) {
    const pcbGroup = circuitJson.find(
      (elm: any) =>
        elm.type === "pcb_group" &&
        elm.pcb_group_id === component.positioned_relative_to_pcb_group_id,
    ) as any

    if (pcbGroup?.center) {
      // When position_mode is "relative", the component's center is a relative offset from the group
      actualPosition = {
        x: pcbGroup.center.x + center.x,
        y: pcbGroup.center.y + center.y,
      }
    }
  }
  
  const [x, y] = applyToPoint(transform, [actualPosition.x, actualPosition.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`

  const svgObjects: SvgObject[] = []

  // Add anchor offset indicators if this component is positioned relative to a group
  if (
    ctx.showAnchorOffsets &&
    component.positioned_relative_to_pcb_group_id &&
    component.position_mode === "relative" &&
    circuitJson
  ) {
    // Find the referenced PCB group
    const pcbGroup = circuitJson.find(
      (elm: any) =>
        elm.type === "pcb_group" &&
        elm.pcb_group_id === component.positioned_relative_to_pcb_group_id,
    ) as any

    if (pcbGroup?.center) {
      svgObjects.push(
        ...createPcbComponentAnchorOffsetIndicators({
          groupAnchorPosition: pcbGroup.center,
          componentPosition: actualPosition,
          transform,
          componentWidth: width,
          componentHeight: height,
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
