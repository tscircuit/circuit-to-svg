/**
 * Clamps a computed length so it can be written into an SVG attribute.
 *
 * Per the SVG spec a negative value for `r`, `width` or `height` is an error and
 * renderers must not draw the shape, and `NaN`/`Infinity` are not lengths at
 * all. Either way the element silently disappears instead of merely looking
 * wrong, so clamp to 0 and keep the surrounding markup well-formed.
 */
export const toSvgLength = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0
