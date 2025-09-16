// Renders schematic_component.symbol (inline primitives) to an SVG <g> string.

export type SymbolPrimitive =
  | {
      kind: "line"
      x1: number
      y1: number
      x2: number
      y2: number
      stroke_width?: number
    }
  | {
      kind: "rect"
      x: number
      y: number
      width: number
      height: number
      rx?: number
      ry?: number
      stroke_width?: number
      filled?: boolean
    }
  | {
      kind: "circle"
      cx: number
      cy: number
      r: number
      stroke_width?: number
      filled?: boolean
    }
  | {
      kind: "arc"
      cx: number
      cy: number
      r: number
      start_deg: number
      end_deg: number
      stroke_width?: number
    }
  | {
      kind: "text"
      x: number
      y: number
      text: string
      font_size?: number
      rotate_deg?: number
    }

export type SchematicSymbol = {
  name?: string
  width?: number
  height?: number
  primitives: SymbolPrimitive[]
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))
  let sweep = endDeg - startDeg
  while (sweep < 0) sweep += 360
  while (sweep > 360) sweep -= 360
  const largeArc = sweep >= 180 ? 1 : 0
  const sweepFlag = 1 // CCW
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`
}

/**
 * Render a <g> with primitives, optionally scaled to target size.
 * @param symbol inline SchematicSymbol
 * @param opts   SVG styling/scale hints (stroke, target size, extra transforms)
 */
export function renderSymbol(
  symbol: SchematicSymbol,
  opts: {
    stroke?: string
    targetWidth?: number
    targetHeight?: number
    extraTransform?: string
  } = {},
): string {
  const {
    stroke = "currentColor",
    targetWidth,
    targetHeight,
    extraTransform,
  } = opts
  const srcW = symbol.width ?? 10
  const srcH = symbol.height ?? 10
  const sx = targetWidth ? targetWidth / srcW : 1
  const sy = targetHeight ? targetHeight / srcH : 1
  const tf = [`scale(${sx} ${sy})`]
  if (extraTransform) tf.push(extraTransform)
  const groupTransform = tf.join(" ")

  const parts: string[] = [`<g transform="${groupTransform}">`]

  for (const p of symbol.primitives || []) {
    const sw = (p as any).stroke_width ?? 0.2
    switch (p.kind) {
      case "line":
        parts.push(
          `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${stroke}" stroke-width="${sw}" fill="none" />`,
        )
        break
      case "rect":
        parts.push(
          `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}"${p.rx != null ? ` rx="${p.rx}"` : ""}${
            p.ry != null ? ` ry="${p.ry}"` : ""
          } stroke="${stroke}" stroke-width="${sw}" fill="${p.filled ? stroke : "none"}" />`,
        )
        break
      case "circle":
        parts.push(
          `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" stroke="${stroke}" stroke-width="${sw}" fill="${
            p.filled ? stroke : "none"
          }" />`,
        )
        break
      case "arc":
        parts.push(
          `<path d="${arcPath(p.cx, p.cy, p.r, p.start_deg, p.end_deg)}" stroke="${stroke}" stroke-width="${sw}" fill="none" />`,
        )
        break
      case "text": {
        const rotate =
          p.rotate_deg != null
            ? ` transform="rotate(${p.rotate_deg} ${p.x} ${p.y})"`
            : ""
        const fs = p.font_size != null ? ` font-size="${p.font_size}"` : ""
        parts.push(
          `<text x="${p.x}" y="${p.y}"${fs}${rotate} fill="${stroke}">${escapeText(p.text ?? "")}</text>`,
        )
        break
      }
      default:
        // ignore unknown
        break
    }
  }

  parts.push(`</g>`)
  return parts.join("")
}

function escapeText(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
