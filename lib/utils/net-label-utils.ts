import type { SchematicNetLabel } from "circuit-json"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import { type Matrix } from "transformation-matrix"
import { type TextPrimitive } from "schematic-symbols"

export const ARROW_POINT_WIDTH_FSR = 0.3
export const END_PADDING_FSR = 0.3
export const END_PADDING_EXTRA_PER_CHARACTER_FSR = 0.06

export const ninePointAnchorToTextAnchor: Record<
  TextPrimitive["anchor"],
  "middle" | "start" | "end"
> = {
  top_left: "start",
  top_right: "end",
  middle_left: "start",
  middle_right: "end",
  bottom_left: "start",
  bottom_right: "end",
  center: "middle",
  middle_top: "middle",
  middle_bottom: "middle",
}

export const ninePointAnchorToDominantBaseline: Record<
  TextPrimitive["anchor"],
  "auto" | "hanging" | "middle"
> = {
  top_left: "auto",
  top_right: "auto",
  bottom_left: "hanging",
  bottom_right: "hanging",
  center: "auto",
  middle_left: "middle",
  middle_right: "middle",
  middle_top: "auto",
  middle_bottom: "hanging",
}

export function getPathRotation(anchorSide: string): number {
  const rotationMap = {
    left: 180,
    top: 90,
    bottom: -90,
    right: 0,
  }
  return rotationMap[anchorSide as keyof typeof rotationMap] ?? 0
}

export function getTextOffsets(pathRotation: number, transform: Matrix) {
  const scale = Math.abs(transform.a)
  const baseOffset = scale * 0.1

  const rotationOffsetMap: Record<string, { x: number; y: number }> = {
    "0": { x: baseOffset * 0.8, y: -baseOffset }, // Left
    "-90": { x: baseOffset * 3.3, y: baseOffset * 2.8 }, // Top
    "90": { x: -baseOffset * 3.55, y: -baseOffset * 4.2 }, // Bottom
    "180": { x: -baseOffset * 0.85, y: -baseOffset * 0.2 }, // Right
  }

  return rotationOffsetMap[pathRotation.toString()] || { x: 0, y: 0 }
}

export function calculateAnchorPosition(
  schNetLabel: SchematicNetLabel,
  fontSizeMm: number,
  textWidthFSR: number,
) {
  const fullWidthFsr =
    textWidthFSR +
    ARROW_POINT_WIDTH_FSR * 2 +
    END_PADDING_EXTRA_PER_CHARACTER_FSR * schNetLabel.text.length +
    END_PADDING_FSR

  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side,
  )

  return (
    schNetLabel.anchor_position ?? {
      x:
        schNetLabel.center.x -
        (realTextGrowthVec.x * fullWidthFsr * fontSizeMm) / 2,
      y:
        schNetLabel.center.y -
        (realTextGrowthVec.y * fullWidthFsr * fontSizeMm) / 2,
    }
  )
}
