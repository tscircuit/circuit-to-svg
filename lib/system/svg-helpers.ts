import type { SvgObject } from "lib/svg-object"
import { estimateTextWidth } from "lib/sch/estimate-text-width"
import { formatNumber } from "lib/utils/svg-object-utils"
import type { SystemColorMap } from "./colors"

export function element(
  name: string,
  attributes: Record<string, string> = {},
  children: SvgObject[] = [],
): SvgObject {
  return { name, type: "element", value: "", attributes, children }
}

export function textElement(
  name: string,
  text: string,
  attributes: Record<string, string> = {},
): SvgObject {
  // svgson escapes the first CDATA terminator in each text node.
  const children = text.split(/(?<=\]\]>)/).map((value) => ({
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }))
  return element(name, attributes, children)
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  // Shared metrics use line height; allow for the font's em size and fallbacks.
  const widthOf = (value: string) => estimateTextWidth(value) * fontSize * 1.2
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ""
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && widthOf(`${line} ${word}`) <= maxWidth) {
        line += ` ${word}`
        continue
      }
      if (line) lines.push(line)
      line = ""
      // Split long identifiers as well as wrapping at word boundaries.
      for (const char of word) {
        if (line && widthOf(line + char) > maxWidth) {
          lines.push(line)
          line = ""
        }
        line += char
      }
    }
    lines.push(line)
  }
  return lines
}

/** Fit text inside resolved bounds without resizing or moving the block. */
export function createBlockText({
  x,
  y,
  width,
  height,
  title,
  description,
  colors,
  isGroup,
}: {
  x: number
  y: number
  width: number
  height: number
  title: string
  description?: string
  colors: SystemColorMap
  isGroup: boolean
}): SvgObject {
  const padding = Math.min(2, width / 10, height / 10)
  const contentWidth = width - 2 * padding
  const contentHeight = isGroup
    ? Math.min(12, height - 2 * padding)
    : height - 2 * padding
  const baseTitleSize = Math.min(3, contentWidth)
  const baseDescriptionSize = Math.min(2.4, contentWidth)
  const titleLines = wrapText(title, contentWidth, baseTitleSize)
  const descriptionLines = description
    ? wrapText(description, contentWidth, baseDescriptionSize)
    : []
  const gap = descriptionLines.length ? 1.2 : 0
  const baseHeight =
    titleLines.length * baseTitleSize * 1.3 +
    gap +
    descriptionLines.length * baseDescriptionSize * 1.3
  const textScale = Math.min(1, contentHeight / baseHeight)
  let cursorY = isGroup ? 0 : (contentHeight - baseHeight * textScale) / 2
  const children: SvgObject[] = []
  for (const [lines, baseSize, fill, className] of [
    [titleLines, baseTitleSize, colors.text, "system-block-title"],
    [
      descriptionLines,
      baseDescriptionSize,
      colors.secondaryText,
      "system-block-description",
    ],
  ] as const) {
    const size = baseSize * textScale
    for (const line of lines) {
      cursorY += size
      children.push(
        textElement("text", line, {
          class: className,
          x: isGroup ? "0" : formatNumber(contentWidth / 2),
          y: formatNumber(cursorY),
          "text-anchor": isGroup ? "start" : "middle",
          "font-size": formatNumber(size),
          fill,
        }),
      )
      cursorY += size * 0.3
    }
    if (className === "system-block-title") cursorY += gap * textScale
  }
  // Nested viewports clip text without document-global clipPath IDs.
  return element(
    "svg",
    {
      x: formatNumber(x + padding),
      y: formatNumber(y + padding),
      width: formatNumber(contentWidth),
      height: formatNumber(contentHeight),
      overflow: "hidden",
    },
    children,
  )
}
