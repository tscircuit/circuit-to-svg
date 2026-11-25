import type { PcbFabricationNoteText } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// These reference points come from Circuit JSON, never the text renderer's
// transform or measured bounds. A misplaced label must move off its marker.
export function renderAnchorCrosshair(x: number, y: number): string {
  return `<g stroke="#ffcb47" stroke-width="2" fill="#ffcb47"><path d="M ${x - 10} ${y} H ${x + 10} M ${x} ${y - 10} V ${y + 10}"/><circle cx="${x}" cy="${y}" r="3"/></g>`
}

export function renderFabricationTextAnchorSnapshot(
  note: PcbFabricationNoteText,
): string {
  const { x, y } = note.anchor_position
  const viewport = { minX: x - 8, minY: y - 8, maxX: x + 8, maxY: y + 8 }
  const renderOptions = {
    layer: "bottom" as const,
    backgroundColor: "#14583e",
    includeVersion: false,
  }
  const fixedView = convertCircuitJsonToPcbSvg([note], {
    ...renderOptions,
    viewport,
    width: 520,
    height: 520,
  }).replace("<svg ", '<svg x="40" y="100" ')
  const autoView = convertCircuitJsonToPcbSvg([note], {
    ...renderOptions,
    width: 400,
    height: 130,
  }).replace("<svg ", '<svg x="570" y="510" ')
  const grid: string[] = []
  for (let offset = -8; offset <= 8; offset += 2) {
    const p = (offset + 8) * (520 / 16)
    grid.push(
      `<path d="M ${p} 0 V 520 M 0 ${p} H 520" stroke="#a9d2bf" opacity="${offset === 0 ? 0.6 : 0.18}"/>`,
      `<text x="${p}" y="546" text-anchor="middle">${x + offset}</text>`,
      `<text x="-5" y="${520 - p + 5}" text-anchor="end">${y + offset}</text>`,
    )
  }
  const json = JSON.stringify(
    {
      type: note.type,
      text: note.text,
      layer: note.layer,
      anchor_position: note.anchor_position,
      anchor_alignment: note.anchor_alignment,
      ccw_rotation: note.ccw_rotation ?? 0,
      font: note.font,
      font_size: note.font_size,
    },
    null,
    2,
  )
    .split("\n")
    .map(
      (line, index) =>
        `<text x="570" y="${112 + index * 23}" xml:space="preserve">${escapeXml(line)}</text>`,
    )
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="710" viewBox="0 0 1020 710">
    <rect width="1020" height="710" fill="#f4f7fa"/>
    <g font-family="monospace" fill="#172a3a">
      <text x="20" y="30" font-size="22">Bottom FAB: ${escapeXml(note.text)} | ${note.anchor_alignment} | ${note.ccw_rotation ?? 0} deg</text>
      <text x="20" y="65" font-size="16">Top-down PCB coordinates: +X right, +Y up. Amber = input anchor.</text>
      ${fixedView}
      <g transform="translate(40 100)" font-size="12" fill="#172a3a">${grid.join("")}${renderAnchorCrosshair(260, 260)}</g>
      <g font-size="16">${json}</g>
      <text x="570" y="490" font-size="16">Automatic bounds (no board):</text>
      ${autoView}
      <text x="20" y="690" font-size="15">2 mm grid; amber = input anchor; white box = calculated bounds. Viewport is fixed at 16 mm.</text>
    </g>
  </svg>`
}
