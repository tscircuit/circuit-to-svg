/**
 * Clamps a computed length so it is safe to write into an SVG attribute.
 *
 * Per the SVG spec a negative value for `r`, `width` or `height` is an error and
 * renderers must not draw the shape, and `NaN`/`Infinity` are not lengths at
 * all. In both cases the element silently disappears rather than merely looking
 * wrong, which hides the real problem, so clamp to 0 and keep the surrounding
 * markup well-formed.
 */
export const toSvgLength = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0
