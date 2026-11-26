import { expect } from "bun:test"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { decodeImageFromBuffer } from "poppygl"

/** Compare native PNGs without wrapping rendered 3D views in an SVG panel. */
export async function expectPngSnapshot(
  actual: Uint8Array,
  testPath: string,
  name: string,
): Promise<void> {
  const directory = join(dirname(testPath), "__snapshots__")
  const path = join(directory, `${name}.snap.png`)
  if (!existsSync(path) || process.env.BUN_UPDATE_SNAPSHOTS) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(path, actual)
    return
  }
  const [expected, received] = await Promise.all([
    decodeImageFromBuffer(readFileSync(path), "image/png"),
    decodeImageFromBuffer(actual, "image/png"),
  ])
  expect(received.width).toBe(expected.width)
  expect(received.height).toBe(expected.height)
  let changedPixels = 0
  for (let i = 0; i < expected.data.length; i += 4) {
    if (
      [0, 1, 2].some(
        (channel) =>
          Math.abs(expected.data[i + channel]! - received.data[i + channel]!) >
          12,
      )
    )
      changedPixels++
  }
  const difference = changedPixels / (expected.width * expected.height)
  if (difference > 0.0001)
    writeFileSync(path.replace(".png", ".diff.png"), actual)
  expect(difference).toBeLessThanOrEqual(0.0001)
}
