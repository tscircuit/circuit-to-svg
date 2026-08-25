/**
 * tscircuit/circuit-to-svg - Solder Mask Layer Renderer
 */
export interface SolderMaskPadConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  expansionMargin?: number;
}

export function renderSolderMaskApertureSvg(pads: SolderMaskPadConfig[], defaultExpansion: number = 0.05): string {
  const elements = pads.map(pad => {
    const exp = pad.expansionMargin ?? defaultExpansion;
    const w = pad.width + exp * 2;
    const h = pad.height + exp * 2;
    const x = pad.x - exp;
    const y = pad.y - exp;
    return `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" fill="#4a0e4e" opacity="0.8" />`;
  });

  return `<g class="solder-mask-layer">${elements.join('')}</g>`;
}
