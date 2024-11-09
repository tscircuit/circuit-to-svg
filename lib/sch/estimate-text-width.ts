import { arialTextMetrics } from "./arial-text-metrics"

export const estimateTextWidth = (text: string): number => {
  if (!text) return 0

  let totalWidth = 0
  for (const char of text) {
    const metrics = arialTextMetrics[char as keyof typeof arialTextMetrics]
    if (metrics) {
      totalWidth += metrics.width
    } else {
      // Default width for unknown characters
      totalWidth += arialTextMetrics["?"].width
    }
  }

  // Return width normalized to font size 1
  return totalWidth / 27 // Normalize by font height from metrics
}
