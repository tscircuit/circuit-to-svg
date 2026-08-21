export function calculateCenteredViewBox(minX: number, minY: number, width: number, height: number, margin = 20) {
  return `${minX - margin} ${minY - margin} ${width + margin * 2} ${height + margin * 2}`;
}
