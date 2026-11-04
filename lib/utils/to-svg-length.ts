/**
 * Clamps a computed length so it can be written into an SVG attribute.
 *
 * Per the SVG spec a negative value for `r`, `rx`, `ry`, `width` or `height` is
 * an error and renderers must not draw the shape, and `NaN`/`Infinity` are not
 * lengths at all. Clamp to 0 to keep the emitted markup well-formed.
 */
export const toSvgLength = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0
