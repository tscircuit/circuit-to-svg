/** Preserve each horizontal bucket's extrema and their order in a display-only preview. */
export function previewEnvelope(
  x: readonly number[],
  values: readonly number[],
  width: number,
): { x: number[]; values: number[] } {
  const buckets = Math.max(1, Math.floor(width))
  if (x.length <= buckets * 2) return { x: [...x], values: [...values] }
  const span = x[x.length - 1]! - x[0]!
  const indices: number[] = [0]
  let currentBucket = -1
  let minimum = 0
  let maximum = 0
  const flush = () => {
    indices.push(...[minimum, maximum].sort((a, b) => a - b))
  }
  for (let index = 0; index < x.length; index++) {
    const bucket = Math.min(
      buckets - 1,
      Math.floor(((x[index]! - x[0]!) / span) * buckets),
    )
    if (bucket !== currentBucket) {
      if (currentBucket >= 0) flush()
      currentBucket = bucket
      minimum = maximum = index
    } else {
      if (values[index]! < values[minimum]!) minimum = index
      if (values[index]! > values[maximum]!) maximum = index
    }
  }
  flush()
  indices.push(x.length - 1)
  const uniqueIndices = [...new Set(indices)]
  return {
    x: uniqueIndices.map((index) => x[index]!),
    values: uniqueIndices.map((index) => values[index]!),
  }
}
