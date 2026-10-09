import { applyToPoint, type Matrix } from "transformation-matrix"
import {
  svgElement,
  textNode,
} from "../../sim/simulation-graph-svg/simulation-graph-svg-shared"

export interface PcbNoiseContactHighlight {
  portName: string
  role: "signal" | "reference"
  contact: { x: number; y: number; layer: string }
}

export function createNoiseContactSvgObjects(
  contacts: readonly PcbNoiseContactHighlight[],
  transform: Matrix,
  viewport: { width: number; height: number },
  layer?: string,
) {
  return contacts.flatMap(({ contact, portName, role }) => {
    if (layer && layer !== contact.layer) return []
    if (!Number.isFinite(contact.x) || !Number.isFinite(contact.y))
      throw new Error("PCB noise contacts require finite physical coordinates")
    const [x, y] = applyToPoint(transform, [contact.x, contact.y])
    const color = role === "signal" ? "#08d9ef" : "#ed80e6"
    const label = `${portName} · ${role}`
    const estimatedWidth = label.length * 12
    const left =
      x + 12 + estimatedWidth > viewport.width - 8 && x > viewport.width / 2
    const labelX = Math.max(
      8,
      Math.min(viewport.width - 8, x + (left ? -12 : 12)),
    )
    const availableWidth = left ? labelX - 8 : viewport.width - 8 - labelX
    return [
      svgElement(
        "g",
        {
          "data-type": "simulation_pcb_noise_contact",
          "data-port-name": portName,
          "data-contact-role": role,
          "data-pcb-layer": contact.layer,
        },
        [
          svgElement("circle", {
            cx: String(x),
            cy: String(y),
            r: "8",
            stroke: color,
            "stroke-width": "3",
            fill: "none",
          }),
          svgElement(
            "text",
            {
              x: String(labelX),
              y: String(Math.max(20, Math.min(viewport.height - 8, y - 12))),
              "text-anchor": left ? "end" : "start",
              ...(estimatedWidth > availableWidth
                ? {
                    textLength: String(Math.max(1, availableWidth)),
                    lengthAdjust: "spacingAndGlyphs",
                  }
                : {}),
              fill: color,
              "font-family": "sans-serif",
              "font-size": "12",
              "paint-order": "stroke",
              stroke: "#122b29",
              "stroke-width": "4",
            },
            [textNode(label)],
          ),
        ],
      ),
    ]
  })
}
