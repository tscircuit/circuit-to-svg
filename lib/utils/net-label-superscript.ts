import type { SchematicNetLabel, SchematicText } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { estimateTextWidth } from "lib/sch/estimate-text-width"

// Structural extension allows rendering before the circuit-json schema release.
export type NetLabelWithSuperscript = SchematicNetLabel & {
  display_superscript?: string
}

export type SchematicTextWithSuperscript = SchematicText & {
  display_superscript?: string
}

const SUPERSCRIPT_SCALE = 0.65
const SUPERSCRIPT_GAP = 0.08

export function getNetLabelTextWidth(label: {
  text: string
  display_superscript?: string
}): number {
  return (
    estimateTextWidth(label.text || "") +
    (label.display_superscript
      ? SUPERSCRIPT_GAP +
        estimateTextWidth(label.display_superscript) * SUPERSCRIPT_SCALE
      : 0)
  )
}

export function createNetLabelTextChildren(
  text: string,
  superscript: string | undefined,
  fontSizePx: number,
  dominantBaseline = "central",
): SvgObject[] {
  const children: SvgObject[] = [
    {
      type: "text",
      value: text,
      name: "",
      attributes: {},
      children: [],
    },
  ]
  if (superscript) {
    children.push({
      type: "element",
      name: "tspan",
      value: "",
      attributes: {
        class: "sch-net-label-superscript",
        "font-size": `${fontSizePx * SUPERSCRIPT_SCALE}px`,
        dx: `${fontSizePx * SUPERSCRIPT_GAP}`,
        // Ideographic anchoring moves smaller glyphs downward; compensate
        // so power-symbol suffixes rise like centrally anchored label text.
        dy: `${-fontSizePx * (dominantBaseline === "ideographic" ? 0.5 : 0.25)}`,
      },
      children: [
        {
          type: "text",
          value: superscript,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    })
  }
  return children
}
