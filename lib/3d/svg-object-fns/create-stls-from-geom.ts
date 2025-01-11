import stlSerializer from "@jscad/stl-serializer"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"

type StlObj = { hash: string; stlData: ArrayBuffer; color: number[] }

export const createStlsFromGeom = (geom: Geom3[] | Geom3): StlObj[] => {
  const geometries = Array.isArray(geom) ? geom : [geom]

  const stls = geometries.map((g) => {
    const rawData = stlSerializer.serialize({ binary: true }, [g])
    const stlData = join(rawData)
    return { hash: hash(stlData), stlData, color: g.color! }
  })

  return stls
}

function join(buffers: ArrayBuffer[]) {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }
  return result.buffer
}

function hash(buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer)
  let hash = 0
  for (let i = 0; i < view.length; i++) {
    hash = (hash * 31 + view[i]!) >>> 0
  }
  return hash.toString(16)
}
