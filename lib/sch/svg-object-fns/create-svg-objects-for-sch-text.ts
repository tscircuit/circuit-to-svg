import type { SchematicText } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
import { type Matrix, applyToPoint } from "transformation-matrix"

type TextDecorationRange = {
  start: number
  end: number
  decoration: "overline" | "underline" | "line-through"
}

type SchematicTextWithDecorations = SchematicText & {
  text_decoration_ranges?: TextDecorationRange[]
}

export const createSvgSchText = ({
  elm,
  transform,
  colorMap,
}: {
  elm: SchematicTextWithDecorations
  transform: Matrix
  colorMap: ColorMap
}): SvgObject => {
  // Apply transformation
  const center = applyToPoint(transform, elm.position)

  const textAnchorMap: Record<
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top_left"
    | "top_center"
    | "top_right"
    | "center_left"
    | "center_right"
    | "bottom_left"
    | "bottom_center"
    | "bottom_right",
    string
  > = {
    center: "middle",
    center_right: "end",
    bottom_left: "start",
    bottom_center: "middle",
    bottom_right: "end",
    left: "start",
    right: "end",
    top: "middle",
    bottom: "middle",
    top_left: "start",
    top_center: "middle",
    top_right: "end",
    center_left: "start",
  }

  const dominantBaselineMap: Record<
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top_left"
    | "top_center"
    | "top_right"
    | "center_left"
    | "center_right"
    | "bottom_left"
    | "bottom_center"
    | "bottom_right",
    string
  > = {
    center: "middle",
    center_right: "middle",
    bottom_left: "ideographic",
    bottom_center: "ideographic",
    bottom_right: "ideographic",
    left: "middle",
    right: "middle",
    top: "hanging",
    bottom: "ideographic",
    top_left: "hanging",
    top_center: "hanging",
    top_right: "hanging",
    center_left: "middle",
  }

  const lines = elm.text.split("\n")

  const children: SvgObject[] = elm.text_decoration_ranges?.length
    ? createDecoratedTextChildren(
        elm.text,
        elm.text_decoration_ranges,
        elm.schematic_text_id,
      )
    : lines.length === 1
      ? [
          {
            type: "text",
            value: elm.text,
            name: elm.schematic_text_id,
            attributes: {},
            children: [],
          },
        ]
      : lines.map((line, idx) => ({
          type: "element",
          name: "tspan",
          value: "",
          attributes: {
            x: center.x.toString(),
            ...(idx > 0 ? { dy: "1em" } : {}),
          },
          children: [
            {
              type: "text",
              value: line,
              name: idx === 0 ? elm.schematic_text_id : "",
              attributes: {},
              children: [],
            },
          ],
        }))

  return {
    type: "element",
    name: "text",
    value: "",
    attributes: {
      class: "sch-text",
      x: center.x.toString(),
      y: center.y.toString(),
      fill: elm.color ?? colorMap.schematic.sheet_label,
      "text-anchor": textAnchorMap[elm.anchor],
      "dominant-baseline": dominantBaselineMap[elm.anchor],
      "font-family": "sans-serif",
      "font-size": `${getSchScreenFontSize(transform, "reference_designator", elm.font_size)}px`,
      transform: `rotate(${elm.rotation}, ${center.x}, ${center.y})`,
    },
    children,
  }
}

const createDecoratedTextChildren = (
  text: string,
  ranges: TextDecorationRange[],
  schematicTextId: string,
): SvgObject[] => {
  const characters = Array.from(text)
  const boundaries = new Set([0, characters.length])
  for (const range of ranges) {
    boundaries.add(range.start)
    boundaries.add(range.end)
  }
  const sortedBoundaries = [...boundaries].sort((a, b) => a - b)

  return sortedBoundaries.slice(0, -1).map((start, index) => {
    const end = sortedBoundaries[index + 1]
    const decorations = ranges
      .filter((range) => range.start <= start && range.end >= end)
      .map((range) => range.decoration)

    return {
      type: "element",
      name: "tspan",
      value: "",
      attributes:
        decorations.length > 0
          ? { style: `text-decoration: ${decorations.join(" ")};` }
          : {},
      children: [
        {
          type: "text",
          value: characters.slice(start, end).join(""),
          name: index === 0 ? schematicTextId : "",
          attributes: {},
          children: [],
        },
      ],
    }
  })
}
