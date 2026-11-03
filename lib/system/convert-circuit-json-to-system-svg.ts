import type {
  AnyCircuitElement,
  Point,
  SystemBlockComponent,
  SystemBlockGroup,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { stringifySvg } from "lib/utils/stringify-svg"
import { formatNumber } from "lib/utils/svg-object-utils"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import { DEFAULT_SYSTEM_COLOR_MAP, type SystemColorMap } from "./colors"
import { prepareSystemPage } from "./prepare-system-page"
import { createBlockText, element, textElement } from "./svg-helpers"

export interface SystemSvgOptions {
  /** Defaults to the first system_block_page in document order. */
  systemBlockPageId?: string
  /** Output pixels. With one dimension supplied, derive the other from the page. */
  width?: number
  height?: number
  colorOverrides?: Partial<SystemColorMap>
  includeVersion?: boolean
}

/** Render a resolved system page without changing its bounds, routes, or labels. */
export function convertCircuitJsonToSystemSvg(
  circuitJson: AnyCircuitElement[],
  options: SystemSvgOptions = {},
): string {
  const { page, groups, components, connections } = prepareSystemPage(
    circuitJson,
    options.systemBlockPageId,
  )
  const colors = { ...DEFAULT_SYSTEM_COLOR_MAP, ...options.colorOverrides }
  const width =
    options.width ??
    (options.height === undefined
      ? 1000
      : (options.height * page.width) / page.height)
  const height = options.height ?? (width * page.height) / page.width
  if (![width, height].every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error(
      "System SVG width and height must be positive finite numbers",
    )
  }
  const toSvg = (p: Point) => ({
    x: page.width / 2 + p.x,
    y: page.height / 2 - p.y,
  })
  const blocks: SvgObject[] = []
  for (const block of [...groups, ...components]) {
    const isGroup = block.type === "system_block_group"
    const id = isGroup
      ? block.system_block_group_id
      : block.system_block_component_id
    const p = toSvg(block.center)
    const x = p.x - block.width / 2
    const y = p.y - block.height / 2
    const title = block.display_name ?? block.name ?? id
    blocks.push(
      element(
        "g",
        {
          class: isGroup ? "system-block-group" : "system-block-component",
          [isGroup
            ? "data-system-block-group-id"
            : "data-system-block-component-id"]: id,
          ...pcbAttributes(block),
        },
        [
          textElement("title", title),
          ...(block.description === undefined
            ? []
            : [textElement("desc", block.description)]),
          element("rect", {
            x: formatNumber(x),
            y: formatNumber(y),
            width: formatNumber(block.width),
            height: formatNumber(block.height),
            rx: formatNumber(
              Math.min(isGroup ? 1.5 : 1, block.width / 10, block.height / 10),
            ),
            fill: isGroup ? colors.groupFill : colors.componentFill,
            stroke: isGroup ? colors.groupStroke : colors.componentStroke,
            "stroke-width": "0.3",
          }),
          createBlockText({
            x,
            y,
            width: block.width,
            height: block.height,
            title,
            description: block.description,
            colors,
            isGroup,
          }),
        ],
      ),
    )
  }
  const paths: SvgObject[] = []
  const labels: SvgObject[] = []
  for (const connection of connections) {
    const mixed = connection.is_signal && connection.is_power
    const color = mixed
      ? colors.mixed
      : connection.is_power
        ? colors.power
        : connection.is_signal
          ? colors.signal
          : colors.connection
    const route = connection.route.map(toSvg)
    const children = [
      element("polyline", {
        points: route
          .map((p) => `${formatNumber(p.x)},${formatNumber(p.y)}`)
          .join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": "0.4",
        "stroke-linejoin": "round",
        ...(mixed
          ? { "stroke-dasharray": "2 1 0.5 1" }
          : connection.is_power
            ? { "stroke-dasharray": "2 1" }
            : {}),
      }),
    ]
    if (connection.direction !== "none") {
      children.push(createArrow(route.at(-1)!, route.at(-2)!, color))
      if (connection.direction === "both")
        children.push(createArrow(route[0]!, route[1]!, color))
    }
    paths.push(
      element(
        "g",
        {
          class: "system-block-connection",
          "data-system-block-connection-id":
            connection.system_block_connection_id,
          "data-from-system-block-component-id":
            connection.from_system_block_component_id,
          "data-to-system-block-component-id":
            connection.to_system_block_component_id,
          "data-is-signal": String(connection.is_signal),
          "data-is-power": String(connection.is_power),
        },
        children,
      ),
    )
    if (connection.label !== undefined) {
      const p = toSvg(connection.label_anchor_center!)
      labels.push(
        textElement("text", connection.label, {
          class: "system-block-connection-label",
          "data-system-block-connection-id":
            connection.system_block_connection_id,
          x: formatNumber(p.x),
          y: formatNumber(p.y),
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size": "2.5",
          fill: colors.secondaryText,
        }),
      )
    }
  }
  const software = getSoftwareUsedString(circuitJson)
  return stringifySvg(
    element(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        class: "tscircuit-system",
        width: formatNumber(width),
        height: formatNumber(height),
        viewBox: `0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}`,
        preserveAspectRatio: "xMidYMid meet",
        "font-family": "Arial, Liberation Sans, Noto Sans, sans-serif",
        "data-system-block-page-id": page.system_block_page_id,
        role: "img",
        ...(software ? { "data-software-used-string": software } : {}),
        ...(options.includeVersion
          ? { "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION }
          : {}),
      },
      [
        textElement(
          "title",
          page.display_name ?? page.name ?? page.system_block_page_id,
        ),
        ...(page.description === undefined
          ? []
          : [textElement("desc", page.description)]),
        element("rect", {
          width: formatNumber(page.width),
          height: formatNumber(page.height),
          fill: colors.background,
        }),
        ...blocks,
        ...paths,
        ...labels,
      ],
    ),
  )
}

function pcbAttributes(
  block: SystemBlockComponent | SystemBlockGroup,
): Record<string, string> {
  return {
    ...(block.pcb_group_id === undefined
      ? {}
      : { "data-pcb-group-id": block.pcb_group_id }),
    ...(block.pcb_component_ids === undefined
      ? {}
      : { "data-pcb-component-ids": JSON.stringify(block.pcb_component_ids) }),
  }
}

/** Explicit triangles avoid SVG marker-ID collisions between embedded diagrams. */
function createArrow(tip: Point, neighbor: Point, color: string): SvgObject {
  const dx = tip.x - neighbor.x
  const dy = tip.y - neighbor.y
  const distance = Math.hypot(dx, dy)
  const length = Math.min(2, distance / 2)
  const ux = dx / distance
  const uy = dy / distance
  const base = { x: tip.x - ux * length, y: tip.y - uy * length }
  return element("polygon", {
    class: "system-block-arrow",
    points: [
      tip,
      { x: base.x - uy * length * 0.45, y: base.y + ux * length * 0.45 },
      { x: base.x + uy * length * 0.45, y: base.y - ux * length * 0.45 },
    ]
      .map((p) => `${formatNumber(p.x)},${formatNumber(p.y)}`)
      .join(" "),
    fill: color,
  })
}
