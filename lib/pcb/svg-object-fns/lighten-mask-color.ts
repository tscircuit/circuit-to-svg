/**
 * Lightens a soldermask color to create a brighter overlay effect.
 * Used for covered copper pours to show soldermask over copper.
 */
export function lightenMaskColor(color: string): string {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10) + 40)
    const g = Math.min(255, parseInt(rgbMatch[2], 10) + 80)
    const b = Math.min(255, parseInt(rgbMatch[3], 10) + 40)
    return `rgb(${r}, ${g}, ${b})`
  }
  return color
}
