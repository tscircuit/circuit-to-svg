import type { SvgObject } from "../svg-object"

const CLEARANCE_ERROR_TYPES = new Set([
  "pcb_pad_trace_clearance_error",
  "pcb_via_trace_clearance_error",
])

interface LabelBounds {
  left: number
  right: number
  top: number
  bottom: number
}

function isClearanceErrorLabel(object: SvgObject): boolean {
  return (
    object.name === "text" &&
    object.attributes?.["data-pcb-layer"] === "overlay" &&
    CLEARANCE_ERROR_TYPES.has(object.attributes?.["data-type"] ?? "")
  )
}

function getLabelText(object: SvgObject): string {
  return object.children.map((child) => child.value ?? "").join("")
}

function getLabelBounds({
  object,
  y,
  fontSize,
}: {
  object: SvgObject
  y: number
  fontSize: number
}): LabelBounds | null {
  const x = Number(object.attributes?.x)
  if (!Number.isFinite(x)) return null

  const estimatedWidth = Math.max(
    fontSize,
    getLabelText(object).length * fontSize * 0.6,
  )

  return {
    left: x - estimatedWidth / 2,
    right: x + estimatedWidth / 2,
    top: y - fontSize,
    bottom: y + fontSize / 3,
  }
}

function boundsOverlap(a: LabelBounds, b: LabelBounds): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

function getAlternatingOffset(index: number, lineHeight: number): number {
  if (index === 0) return 0
  const distance = Math.ceil(index / 2) * lineHeight
  return index % 2 === 1 ? -distance : distance
}

export function separatePcbClearanceErrorLabels(
  svgObjects: SvgObject[],
  svgHeight: number,
): SvgObject[] {
  const placedBounds: LabelBounds[] = []

  return svgObjects.map((object) => {
    if (!isClearanceErrorLabel(object)) return object

    const originalY = Number(object.attributes?.y)
    const fontSize = Number(object.attributes?.["font-size"] ?? 12)
    if (!Number.isFinite(originalY) || !Number.isFinite(fontSize)) return object

    const lineHeight = Math.ceil((fontSize * 4) / 3)
    const maxOffsetAttempts = Math.ceil(svgHeight / lineHeight) * 2 + 1
    let placedY = originalY
    let placedLabelBounds = getLabelBounds({ object, y: placedY, fontSize })

    for (let attempt = 0; attempt < maxOffsetAttempts; attempt++) {
      const candidateY = originalY + getAlternatingOffset(attempt, lineHeight)
      const candidateBounds = getLabelBounds({
        object,
        y: candidateY,
        fontSize,
      })
      if (!candidateBounds) break

      const isInsideViewport =
        candidateBounds.top >= 0 && candidateBounds.bottom <= svgHeight
      const overlapsPlacedLabel = placedBounds.some((bounds) =>
        boundsOverlap(candidateBounds, bounds),
      )

      if (isInsideViewport && !overlapsPlacedLabel) {
        placedY = candidateY
        placedLabelBounds = candidateBounds
        break
      }
    }

    if (placedLabelBounds) placedBounds.push(placedLabelBounds)
    if (placedY === originalY) return object

    return {
      ...object,
      attributes: {
        ...object.attributes,
        y: placedY.toString(),
      },
    }
  })
}
