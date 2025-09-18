import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { type INode as SvgObject, stringify } from "svgson"
import { su } from "@tscircuit/circuit-json-util"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"
import { createSvgObjectsFromPinoutBoard } from "./svg-object-fns/create-svg-objects-from-pinout-board"
import { createSvgObjectsFromPinoutComponent } from "./svg-object-fns/create-svg-objects-from-pinout-component"
import { createSvgObjectsFromPinoutHole } from "./svg-object-fns/create-svg-objects-from-pinout-hole"
import { createSvgObjectsFromPinoutPlatedHole } from "./svg-object-fns/create-svg-objects-from-pinout-plated-hole"
import { createSvgObjectsFromPinoutSmtPad } from "./svg-object-fns/create-svg-objects-from-pinout-smt-pad"
import { createSvgObjectsFromPinoutPort } from "./svg-object-fns/create-svg-objects-from-pinout-port"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"

const OBJECT_ORDER: AnyCircuitElement["type"][] = [
  "pcb_board",
  "pcb_smtpad",
  "pcb_hole",
  "pcb_plated_hole",
  "pcb_component",
  "pcb_port",
]

interface Options {
  width?: number
  height?: number
  includeVersion?: boolean
}

export interface PinoutSvgContext {
  transform: Matrix
  soup: AnyCircuitElement[]
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number }
  label_positions: Map<
    string,
    {
      text: string
      aliases: string[]
      elbow_end: { x: number; y: number }
      label_pos: { x: number; y: number }
      edge: "left" | "right" | "top" | "bottom"
    }
  >
}

function getPortLabelInfo(
  port: PcbPort,
  soup: AnyCircuitElement[],
): { text: string; aliases: string[] } | null {
  const source_port = su(soup).source_port.get(port.source_port_id)
  if (!source_port) return null

  const eligible_hints =
    source_port.port_hints?.filter(
      (h) =>
        !/^\d+$/.test(h) && !["left", "right", "top", "bottom"].includes(h),
    ) ?? []

  let label = eligible_hints[0]
  if (!label) label = source_port.name

  if (!label) return null

  const aliases = eligible_hints.filter((h) => h !== label)

  return { text: label, aliases }
}

function getClosestEdge(
  port_pos_real: { x: number; y: number },
  board_bounds: { minX: number; minY: number; maxX: number; maxY: number },
): "left" | "right" | "top" | "bottom" {
  const dists = {
    left: port_pos_real.x - board_bounds.minX,
    right: board_bounds.maxX - port_pos_real.x,
    top: board_bounds.maxY - port_pos_real.y,
    bottom: port_pos_real.y - board_bounds.minY,
  }

  let closest_edge: "left" | "right" | "top" | "bottom" = "left"
  let min_dist = dists.left

  if (dists.right < min_dist) {
    min_dist = dists.right
    closest_edge = "right"
  }
  if (dists.top < min_dist) {
    min_dist = dists.top
    closest_edge = "top"
  }
  if (dists.bottom < min_dist) {
    min_dist = dists.bottom
    closest_edge = "bottom"
  }

  return closest_edge
}

export function convertCircuitJsonToPinoutSvg(
  soup: AnyCircuitElement[],
  options?: Options,
): string {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Process all elements to determine bounds
  for (const item of soup) {
    if (item.type === "pcb_board") {
      if (
        "outline" in item &&
        item.outline &&
        Array.isArray(item.outline) &&
        item.outline.length > 0
      ) {
        for (const point of item.outline) {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        }
      } else {
        const center = item.center
        const width = item.width || 0
        const height = item.height || 0
        minX = Math.min(minX, center.x - width / 2)
        minY = Math.min(minY, center.y - height / 2)
        maxX = Math.max(maxX, center.x + width / 2)
        maxY = Math.max(maxY, center.y + height / 2)
      }
    }
  }

  const padding = 20
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = options?.width ?? 800
  const svgHeight = options?.height ?? 600

  const scaleX = svgWidth / circuitWidth
  const scaleY = svgHeight / circuitHeight
  const scaleFactor = Math.min(scaleX, scaleY)

  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2

  const transform = compose(
    translate(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor,
    ),
    scale(scaleFactor, -scaleFactor),
  )

  const board_bounds = { minX, minY, maxX, maxY }
  const pinout_ports = soup.filter(
    (elm): elm is PcbPort =>
      elm.type === "pcb_port" && (elm as any).is_board_pinout,
  )

  const ports_by_edge: Record<"left" | "right" | "top" | "bottom", PcbPort[]> =
    {
      left: [],
      right: [],
      top: [],
      bottom: [],
    }

  for (const port of pinout_ports) {
    const edge = getClosestEdge({ x: port.x, y: port.y }, board_bounds)
    ports_by_edge[edge].push(port)
  }

  const label_positions = new Map<
    string,
    {
      text: string
      aliases: string[]
      elbow_end: { x: number; y: number }
      label_pos: { x: number; y: number }
      edge: "left" | "right" | "top" | "bottom"
    }
  >()

  const V_SPACING = 20

  const STAGGER_OFFSET_MIN = 20
  const STAGGER_OFFSET_PER_PIN = 2
  const STAGGER_OFFSET_STEP = 15
  const ALIGNED_OFFSET_MARGIN = 10 // Margin beyond the last staggered point

  const FONT_SIZE = 11
  const BG_PADDING = 5
  const LABEL_RECT_HEIGHT = FONT_SIZE + 2 * BG_PADDING
  const LABEL_MARGIN = 5

  // Left edge
  const left_ports = ports_by_edge.left
    .map((port) => ({
      port,
      y: applyToPoint(transform, [port.x, port.y])[1],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.y - b.y)

  if (left_ports.length > 0) {
    const board_left_x = applyToPoint(transform, [board_bounds.minX, 0])[0]

    const num_labels = left_ports.length
    const middle_index = (num_labels - 1) / 2

    const stagger_offset_base =
      STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

    const max_stagger_offset =
      stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
    const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

    const total_labels_height =
      num_labels * LABEL_RECT_HEIGHT +
      Math.max(0, num_labels - 1) * LABEL_MARGIN
    let current_y =
      (svgHeight - total_labels_height) / 2 + LABEL_RECT_HEIGHT / 2

    left_ports.forEach(({ port, label_info }, i) => {
      const dist_from_middle = Math.abs(i - middle_index)
      const stagger_rank = middle_index - dist_from_middle
      const stagger_offset =
        stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP

      const elbow_end = { x: board_left_x - stagger_offset, y: current_y }
      const label_pos = { x: board_left_x - aligned_label_offset, y: current_y }

      label_positions.set(port.pcb_port_id, {
        text: label_info!.text,
        aliases: label_info!.aliases,
        elbow_end,
        label_pos,
        edge: "left",
      })
      current_y += LABEL_RECT_HEIGHT + LABEL_MARGIN
    })
  }

  // Right edge
  const right_ports = ports_by_edge.right
    .map((port) => ({
      port,
      y: applyToPoint(transform, [port.x, port.y])[1],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.y - b.y)

  if (right_ports.length > 0) {
    const board_right_x = applyToPoint(transform, [board_bounds.maxX, 0])[0]

    const num_labels = right_ports.length
    const middle_index = (num_labels - 1) / 2

    const stagger_offset_base =
      STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

    const max_stagger_offset =
      stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
    const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

    const total_labels_height =
      num_labels * LABEL_RECT_HEIGHT +
      Math.max(0, num_labels - 1) * LABEL_MARGIN
    let current_y =
      (svgHeight - total_labels_height) / 2 + LABEL_RECT_HEIGHT / 2

    right_ports.forEach(({ port, label_info }, i) => {
      const dist_from_middle = Math.abs(i - middle_index)
      const stagger_rank = middle_index - dist_from_middle
      const stagger_offset =
        stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP

      const elbow_end = { x: board_right_x + stagger_offset, y: current_y }
      const label_pos = {
        x: board_right_x + aligned_label_offset,
        y: current_y,
      }

      label_positions.set(port.pcb_port_id, {
        text: label_info!.text,
        aliases: label_info!.aliases,
        elbow_end,
        label_pos,
        edge: "right",
      })
      current_y += LABEL_RECT_HEIGHT + LABEL_MARGIN
    })
  }

  // Top edge
  const top_ports = ports_by_edge.top
    .map((port) => ({
      port,
      x: applyToPoint(transform, [port.x, port.y])[0],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.x - b.x)

  if (top_ports.length > 0) {
    const board_top_y = applyToPoint(transform, [0, board_bounds.maxY])[1]

    const labels_with_widths = top_ports.map((p) => {
      const label = [p.label_info!.text, ...p.label_info!.aliases].join(" | ")
      const textWidth = label.length * FONT_SIZE * 0.6
      const rectWidth = textWidth + 2 * BG_PADDING
      return { ...p, rectWidth }
    })

    const num_labels = labels_with_widths.length
    const middle_index = (num_labels - 1) / 2

    const stagger_offset_base =
      STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

    const max_stagger_offset =
      stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
    const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

    const total_labels_width =
      labels_with_widths.reduce((sum, l) => sum + l.rectWidth, 0) +
      Math.max(0, num_labels - 1) * LABEL_MARGIN
    let current_x = (svgWidth - total_labels_width) / 2

    labels_with_widths.forEach(({ port, label_info, rectWidth }, i) => {
      const dist_from_middle = Math.abs(i - middle_index)
      const stagger_rank = middle_index - dist_from_middle
      const stagger_offset =
        stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP

      const label_center_x = current_x + rectWidth / 2
      const elbow_end = { x: label_center_x, y: board_top_y - stagger_offset }
      const label_pos = {
        x: label_center_x,
        y: board_top_y - aligned_label_offset,
      }

      label_positions.set(port.pcb_port_id, {
        text: label_info!.text,
        aliases: label_info!.aliases,
        elbow_end,
        label_pos,
        edge: "top",
      })
      current_x += rectWidth + LABEL_MARGIN
    })
  }

  // Bottom edge
  const bottom_ports = ports_by_edge.bottom
    .map((port) => ({
      port,
      x: applyToPoint(transform, [port.x, port.y])[0],
      label_info: getPortLabelInfo(port, soup),
    }))
    .filter((p) => p.label_info)
    .sort((a, b) => a.x - b.x)

  if (bottom_ports.length > 0) {
    const board_bottom_y = applyToPoint(transform, [0, board_bounds.minY])[1]

    const labels_with_widths = bottom_ports.map((p) => {
      const label = [p.label_info!.text, ...p.label_info!.aliases].join(" | ")
      const textWidth = label.length * FONT_SIZE * 0.6
      const rectWidth = textWidth + 2 * BG_PADDING
      return { ...p, rectWidth }
    })

    const num_labels = labels_with_widths.length
    const middle_index = (num_labels - 1) / 2

    const stagger_offset_base =
      STAGGER_OFFSET_MIN + num_labels * STAGGER_OFFSET_PER_PIN

    const max_stagger_offset =
      stagger_offset_base + middle_index * STAGGER_OFFSET_STEP
    const aligned_label_offset = max_stagger_offset + ALIGNED_OFFSET_MARGIN

    const total_labels_width =
      labels_with_widths.reduce((sum, l) => sum + l.rectWidth, 0) +
      Math.max(0, num_labels - 1) * LABEL_MARGIN
    let current_x = (svgWidth - total_labels_width) / 2

    labels_with_widths.forEach(({ port, label_info, rectWidth }, i) => {
      const dist_from_middle = Math.abs(i - middle_index)
      const stagger_rank = middle_index - dist_from_middle
      const stagger_offset =
        stagger_offset_base + stagger_rank * STAGGER_OFFSET_STEP

      const label_center_x = current_x + rectWidth / 2
      const elbow_end = {
        x: label_center_x,
        y: board_bottom_y + stagger_offset,
      }
      const label_pos = {
        x: label_center_x,
        y: board_bottom_y + aligned_label_offset,
      }
      label_positions.set(port.pcb_port_id, {
        text: label_info!.text,
        aliases: label_info!.aliases,
        elbow_end,
        label_pos,
        edge: "bottom",
      })
      current_x += rectWidth + LABEL_MARGIN
    })
  }

  const ctx: PinoutSvgContext = {
    transform,
    soup,
    board_bounds,
    label_positions,
  }

  const svgObjects = soup
    .sort(
      (a, b) =>
        (OBJECT_ORDER.indexOf(a.type) ?? 9999) -
        (OBJECT_ORDER.indexOf(b.type) ?? 9999),
    )
    .flatMap((item) => createSvgObjects(item, ctx, soup))

  const softwareUsedString = getSoftwareUsedString(soup)
  const version = CIRCUIT_TO_SVG_VERSION

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(options?.includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    value: "",
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          fill: "rgb(255, 255, 255)",
          x: "0",
          y: "0",
          width: svgWidth.toString(),
          height: svgHeight.toString(),
        },
        value: "",
        children: [],
      },
      ...svgObjects,
    ].filter((child): child is SvgObject => child !== null),
  }

  return stringify(svgObject)
}

function createSvgObjects(
  elm: AnyCircuitElement,
  ctx: PinoutSvgContext,
  soup: AnyCircuitElement[],
): SvgObject[] {
  switch (elm.type) {
    case "pcb_board":
      return createSvgObjectsFromPinoutBoard(elm, ctx)

    case "pcb_component":
      return createSvgObjectsFromPinoutComponent(elm, ctx)
    case "pcb_smtpad":
      return createSvgObjectsFromPinoutSmtPad(elm, ctx)
    case "pcb_hole":
      return createSvgObjectsFromPinoutHole(elm, ctx)
    case "pcb_plated_hole":
      return createSvgObjectsFromPinoutPlatedHole(elm, ctx)
    case "pcb_port":
      if ((elm as any).is_board_pinout) {
        return createSvgObjectsFromPinoutPort(elm, ctx)
      }
      return []
    default:
      return []
  }
}

export default convertCircuitJsonToPinoutSvg
