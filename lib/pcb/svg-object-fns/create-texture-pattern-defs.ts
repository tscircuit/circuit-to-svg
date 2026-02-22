
import { type AnyCircuitElement } from "circuit-json"
import { type INode as SvgObject } from "svgson"
import {- pcbStyle } from "@tscircuit/props"

// Function to generate a unique ID for each texture to avoid collisions
const generateTextureId = (elm: AnyCircuitElement, suffix: string) => {
  return `texture-${elm.type}-${(elm as any)[`${elm.type}_id`]
}-${suffix}`
}

export function createTexturePatternDefs(
  circuitJson: AnyCircuitElement[]
): SvgObject[] {
  const defs: SvgObject[] = []
  const createdPatterns = new Set<string>()

  for (const elm of circuitJson) {
    if ("pcbStyle" in elm && elm.pcbStyle?.texture) {
      const texture = elm.pcbStyle.texture
      const textureId = generateTextureId(elm, "pattern")

      if (createdPatterns.has(textureId)) continue
      createdPatterns.add(textureId)

      if (texture.type === "url") {
        const pattern: SvgObject = {
          name: "pattern",
          type: "element",
          attributes: {
            id: textureId,
            patternUnits: "userSpaceOnUse",
            width: (texture.scale ?? 1) * 10, // Example dimensions, might need to be configurable
            height: (texture.scale ?? 1) * 10,
          },
          children: [
            {
              name: "image",
              type: "element",
              attributes: {
                href: texture.url,
                x: "0",
                y: "0",
                width: "100%",
                height: "100%",
                transform: `rotate(${texture.rotation ?? 0})`,
              },
              children: [],
            },
          ],
        }
        defs.push(pattern)
      }
      // TODO: Implement procedural textures
    }
  }

  return defs
}
