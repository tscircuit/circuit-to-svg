import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"

type SchTextType =
  | "pin_number"
  | "reference_designator"
  | "manufacturer_number"
  | "net_label"
  | "error"

export const getSchMmFontSize = (textType: SchTextType, fontSize?: number) => {
  return textType === "error"
    ? 0.05
    : textType === "pin_number"
      ? 0.15
      : fontSize
        ? fontSize
        : 0.18
}

export const getSchScreenFontSize = (
  transform: Matrix,
  textType: SchTextType,
  fontSize?: number,
) => {
  return Math.abs(transform.a) * getSchMmFontSize(textType, fontSize)
}
