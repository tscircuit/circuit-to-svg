import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"

type SchTextType =
  | "pin_number"
  | "negated_pin_number"
  | "reference_designator"
  | "manufacturer_number"
  | "net_label"
  | "error"

const fontSizeMap: Record<SchTextType, number> = {
  pin_number: 0.15,
  negated_pin_number: 0.15 * 0.8,
  reference_designator: 0.18,
  manufacturer_number: 0.18,
  net_label: 0.18,
  error: 0.05,
}

export const getSchMmFontSize = (textType: SchTextType, fontSize?: number) => {
  return fontSize ?? fontSizeMap[textType]
}

export const getSchScreenFontSize = (
  transform: Matrix,
  textType: SchTextType,
  fontSize?: number,
) => {
  return Math.abs(transform.a) * getSchMmFontSize(textType, fontSize)
}
