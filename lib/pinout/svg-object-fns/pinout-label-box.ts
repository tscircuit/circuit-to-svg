import type { SvgObject } from "lib/svg-object"

export function createPinoutLabelBox(params: {
  rectX: number
  rectY: number
  rectWidth: number
  rectHeight: number
  textX: number
  textY: number
  text: string
  fontSize: number
  labelBackground: string
  labelColor: string
  rx?: number | string
  ry?: number | string
  fontFamily?: string
  fontWeight?: string
  textAnchor?: "start" | "middle" | "end"
  dominantBaseline?:
    | "auto"
    | "text-bottom"
    | "alphabetic"
    | "ideographic"
    | "middle"
    | "central"
    | "mathematical"
    | "hanging"
    | "text-top"
}): SvgObject[] {
  const {
    rectX,
    rectY,
    rectWidth,
    rectHeight,
    textX,
    textY,
    text,
    fontSize,
    labelBackground,
    labelColor,
    rx = 4,
    ry = 4,
    fontFamily = "Arial, sans-serif",
    fontWeight = "bold",
    textAnchor = "middle",
    dominantBaseline = "middle",
  } = params

  return [
    {
      name: "rect",
      type: "element",
      attributes: {
        x: rectX.toString(),
        y: rectY.toString(),
        width: rectWidth.toString(),
        height: rectHeight.toString(),
        fill: labelBackground,
        rx: typeof rx === "number" ? rx.toString() : rx,
        ry: typeof ry === "number" ? ry.toString() : ry,
        stroke: "none",
      },
      children: [],
      value: "",
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: textX.toString(),
        y: textY.toString(),
        fill: labelColor,
        "font-size": `${fontSize}px`,
        "font-family": fontFamily,
        "font-weight": fontWeight,
        "text-anchor": textAnchor,
        "dominant-baseline": dominantBaseline,
      },
      children: [
        {
          type: "text",
          value: text,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    },
  ]
}
