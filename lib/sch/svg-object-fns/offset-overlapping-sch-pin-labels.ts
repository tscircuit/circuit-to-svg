import { estimateTextWidth } from "lib/sch/estimate-text-width"
import type { SvgObject } from "lib/svg-object"

type PortSide = "top" | "bottom" | "left" | "right"
type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const LABEL_GAP_PX = 1
const MAX_OFFSET_STEPS = 8

const getTextContent = (object: SvgObject): string =>
  object.type === "text"
    ? object.value
    : object.children.map(getTextContent).join("")

const getLabelBounds = (label: SvgObject, side: PortSide): Bounds => {
  const x = Number(label.attributes.x)
  const y = Number(label.attributes.y)
  const fontSize = Number.parseFloat(label.attributes["font-size"] ?? "0")
  const textWidth = estimateTextWidth(getTextContent(label)) * fontSize

  if (side === "left") {
    return {
      minX: x,
      maxX: x + textWidth,
      minY: y - fontSize / 2,
      maxY: y + fontSize / 2,
    }
  }
  if (side === "right") {
    return {
      minX: x - textWidth,
      maxX: x,
      minY: y - fontSize / 2,
      maxY: y + fontSize / 2,
    }
  }
  if (side === "bottom") {
    return {
      minX: x - fontSize / 2,
      maxX: x + fontSize / 2,
      minY: y - textWidth,
      maxY: y,
    }
  }
  return {
    minX: x - fontSize / 2,
    maxX: x + fontSize / 2,
    minY: y,
    maxY: y + textWidth,
  }
}

const boundsOverlap = (first: Bounds, second: Bounds) =>
  first.minX < second.maxX + LABEL_GAP_PX &&
  first.maxX + LABEL_GAP_PX > second.minX &&
  first.minY < second.maxY + LABEL_GAP_PX &&
  first.maxY + LABEL_GAP_PX > second.minY

const translateLabel = (label: SvgObject, side: PortSide, distance: number) => {
  const translated = {
    ...label,
    attributes: { ...label.attributes },
  }
  const x = Number(label.attributes.x)
  const y = Number(label.attributes.y)
  const isHorizontalLabel = side === "left" || side === "right"
  const translatedX = isHorizontalLabel ? x : x + distance
  const translatedY = isHorizontalLabel ? y + distance : y

  translated.attributes.x = translatedX.toString()
  translated.attributes.y = translatedY.toString()
  if (!isHorizontalLabel) {
    translated.attributes.transform = `rotate(-90 ${translatedX} ${translatedY})`
  }
  return translated
}

export const offsetOverlappingSchPinLabels = (
  labels: Array<{ label: SvgObject; side: PortSide }>,
) => {
  const placedBounds: Bounds[] = []

  return labels.map(({ label, side }) => {
    const fontSize = Number.parseFloat(label.attributes["font-size"] ?? "0")
    const offsetStep = fontSize + LABEL_GAP_PX
    const candidates = [label]

    for (let step = 1; step <= MAX_OFFSET_STEPS; step++) {
      candidates.push(
        translateLabel(label, side, -offsetStep * step),
        translateLabel(label, side, offsetStep * step),
      )
    }

    const placedLabel =
      candidates.find((candidate) => {
        const bounds = getLabelBounds(candidate, side)
        return !placedBounds.some((placed) => boundsOverlap(bounds, placed))
      }) ?? label

    placedBounds.push(getLabelBounds(placedLabel, side))
    return placedLabel
  })
}
