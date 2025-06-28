export function roundSvgNumbers(obj: import("../svg-object").SvgObject): void {
  function roundValue(value: string): string {
    return value.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (numStr) => {
      const num = Number(numStr)
      if (!Number.isFinite(num)) return numStr
      const rounded = Math.round(num * 10) / 10
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    })
  }

  if (obj.attributes) {
    for (const key of Object.keys(obj.attributes)) {
      const val = obj.attributes[key]
      if (typeof val === "string") {
        obj.attributes[key] = roundValue(val)
      }
    }
  }

  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      roundSvgNumbers(child as any)
    }
  }
}
