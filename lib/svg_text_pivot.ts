export function calculateTextRotationTransform(cx: number, cy: number, angleDeg: number): string {
  if (angleDeg === 0) return '';
  return `rotate(${angleDeg}, ${cx}, ${cy})`;
}
