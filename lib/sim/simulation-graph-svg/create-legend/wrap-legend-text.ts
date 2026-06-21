const MAX_LEGEND_LINE_LENGTH = 15

export function wrapLegendText(label: string): string[] {
  const parts = label.split("_")

  if (parts.length <= 1) {
    return [label]
  }

  const lines: string[] = []
  let currentLine = parts[0] ?? ""

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? ""
    const testLine = `${currentLine}_${part}`

    if (testLine.length > MAX_LEGEND_LINE_LENGTH) {
      lines.push(currentLine)
      currentLine = part
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}
