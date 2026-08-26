/**
 * tscircuit/circuit-to-svg - SVG Bounding Box Clipper
 */
export function buildSvgClipPath(id: string, minX: number, minY: number, width: number, height: number): string {
  return `<clipPath id="${id}"><rect x="${minX.toFixed(2)}" y="${minY.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" /></clipPath>`;
}
