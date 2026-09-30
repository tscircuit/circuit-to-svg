import type { SvgObject } from "../svg-object"
import { excludePcbSvgGeometry } from "./exclude-pcb-svg-geometry"
import { isPcbVoidOverlay } from "./is-pcb-void-overlay"
import { paintPcbVoidMaskShape } from "./paint-pcb-void-mask-shape"
import { selectPcbDrillGeometry } from "./select-pcb-drill-geometry"
import { selectPcbSvgGeometry } from "./select-pcb-svg-geometry"

const PCB_VOID_MASK_ID = "pcb-void-mask"

interface PcbVoidMask {
  definition: SvgObject
  maskedContent: SvgObject
  overlayContent: SvgObject[]
}

export function createPcbVoidMask({
  objects,
  width,
  height,
}: {
  objects: SvgObject[]
  width: number
  height: number
}): PcbVoidMask | undefined {
  const maskedObjects = excludePcbSvgGeometry(objects, isPcbVoidOverlay)
  const overlayContent = selectPcbSvgGeometry(objects, isPcbVoidOverlay)
  const drillObjects = selectPcbDrillGeometry(objects)
  if (drillObjects.length === 0) return undefined

  const mask: SvgObject = {
    name: "mask",
    type: "element",
    value: "",
    attributes: {
      id: PCB_VOID_MASK_ID,
      maskUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: width.toString(),
      height: height.toString(),
    },
    children: [
      {
        name: "rect",
        type: "element",
        value: "",
        attributes: {
          x: "0",
          y: "0",
          width: width.toString(),
          height: height.toString(),
          fill: "#fff",
        },
        children: [],
      },
      ...drillObjects.map(paintPcbVoidMaskShape),
    ],
  }

  return {
    definition: {
      name: "defs",
      type: "element",
      value: "",
      attributes: {},
      children: [mask],
    },
    maskedContent: {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-content-with-voids",
        mask: `url(#${PCB_VOID_MASK_ID})`,
      },
      children: maskedObjects,
    },
    overlayContent,
  }
}
