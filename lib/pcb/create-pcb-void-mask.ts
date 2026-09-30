import type { SvgObject } from "../svg-object"

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
  const maskedObjects = objects.filter((object) => !isPcbOverlay(object))
  const overlayContent = objects.filter(isPcbOverlay)
  const drillObjects = maskedObjects.filter(
    (object) => object.attributes?.["data-pcb-layer"] === "drill",
  )
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
      ...drillObjects.map(createPcbVoidMaskShape),
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

function isPcbOverlay(object: SvgObject): boolean {
  const elementType = object.attributes?.["data-type"] ?? ""
  return (
    elementType.startsWith("pcb_fabrication_note_") ||
    elementType.startsWith("pcb_note_") ||
    elementType.endsWith("_error") ||
    elementType.endsWith("_warning") ||
    elementType === "pcb_rats_nest" ||
    elementType === "pcb_debug_object"
  )
}

function createPcbVoidMaskShape(object: SvgObject): SvgObject {
  return {
    ...object,
    attributes: {
      ...object.attributes,
      fill: "#000",
      stroke: "#000",
      "fill-opacity": "1",
      "stroke-opacity": "1",
    },
  }
}
