import type { PcbPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PinoutSvgContext } from "../convert-circuit-json-to-pinout-svg"
import { calculateElbow } from "calculate-elbow"

const LABEL_COLOR = "rgb(255, 255, 255)"
const LABEL_BACKGROUND = "rgb(0, 0, 0)"
const LINE_COLOR = "rgba(0, 0, 0, 0.6)"

export type FacingDirection = "x-" | "x+" | "y-" | "y+"

export function createSvgObjectsFromPinoutPort(
  pcb_port: PcbPort,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const label_info = ctx.label_positions.get(pcb_port.pcb_port_id)
  if (!label_info) return []

  const { text: label, aliases, elbow_end, label_pos, edge } = label_info

  const [port_x, port_y] = applyToPoint(ctx.transform, [pcb_port.x, pcb_port.y])

  const start_facing_direction: FacingDirection =
    edge === "left"
      ? "x-"
      : edge === "right"
        ? "x+"
        : edge === "top"
          ? "y-"
          : "y+"

  const end_facing_direction: FacingDirection =
    edge === "left"
      ? "x+"
      : edge === "right"
        ? "x-"
        : edge === "top"
          ? "y+"
          : "y-"

  const elbow_path = calculateElbow(
    {
      x: port_x,
      y: port_y,
      facingDirection: start_facing_direction,
    },
    {
      x: elbow_end.x,
      y: elbow_end.y,
      facingDirection: end_facing_direction,
    },
    {},
  )

  const line_points = [...elbow_path, label_pos]
    .map((p) => `${p.x},${p.y}`)
    .join(" ")

  const full_label = [label, ...aliases].join(" | ")

  const fontSize = 11
  const textWidth = full_label.length * fontSize * 0.6
  const bgPadding = 5
  const rectHeight = fontSize + 2 * bgPadding
  const rectWidth = textWidth + 2 * bgPadding
  const text_y = label_pos.y

  let rectX: number
  let text_x: number

  if (edge === "left") {
    rectX = label_pos.x - rectWidth
    text_x = label_pos.x - rectWidth / 2
  } else if (edge === "right") {
    rectX = label_pos.x
    text_x = label_pos.x + rectWidth / 2
  } else {
    rectX = label_pos.x - rectWidth / 2
    text_x = label_pos.x
  }

  return [
    {
      name: "polyline",
      type: "element",
      attributes: {
        points: line_points,
        stroke: LINE_COLOR,
        "stroke-width": "1.5",
        fill: "none",
      },
      children: [],
      value: "",
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        x: rectX.toString(),
        y: (text_y - rectHeight / 2).toString(),
        width: rectWidth.toString(),
        height: rectHeight.toString(),
        fill: LABEL_BACKGROUND,
        rx: "8", // More rounded corners
        ry: "8",
        stroke: "none",
      },
      children: [],
      value: "",
    },
    {
      name: "text",
      type: "element",
      attributes: {
        x: text_x.toString(),
        y: text_y.toString(),
        fill: LABEL_COLOR,
        "font-size": `${fontSize}px`,
        "font-family": "Arial, sans-serif",
        "font-weight": "bold",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      },
      children: [
        {
          type: "text",
          value: full_label,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    },
  ]
}
