import type { SvgObject } from "lib/svg-object"
import { translateNestedSvg } from "lib/utils/svg-object-utils"
import { parseSync } from "svgson"

interface GraphicViewport {
  x: number
  y: number
  width: number
  height: number
}

const SAFE_IMAGE_ATTRIBUTES = [
  "x",
  "y",
  "width",
  "height",
  "preserveAspectRatio",
  "opacity",
  "transform",
  "image-rendering",
] as const

export function createInlineRasterSchematicSvg({
  svgDataUrl,
  viewport,
}: {
  svgDataUrl: string
  viewport: GraphicViewport
}): SvgObject | undefined {
  const svgContent = decodeSvgDataUrl(svgDataUrl)
  if (svgContent === undefined) return undefined

  let svgRoot: SvgObject
  try {
    svgRoot = parseSync(svgContent)
  } catch {
    return undefined
  }

  if (svgRoot.type !== "element" || svgRoot.name.toLowerCase() !== "svg") {
    return undefined
  }
  const viewBox = svgRoot.attributes.viewBox
  if (!viewBox) return undefined

  const elementChildren = svgRoot.children.filter(
    (child) => child.type === "element",
  )
  if (
    elementChildren.length === 0 ||
    elementChildren.some((child) => child.name.toLowerCase() !== "image")
  ) {
    return undefined
  }

  const rasterImages: SvgObject[] = []
  for (const imageElement of elementChildren) {
    const rasterImage = createSafeRasterImage(imageElement)
    if (!rasterImage) return undefined
    rasterImages.push(rasterImage)
  }

  return translateNestedSvg(
    {
      name: "svg",
      type: "element",
      value: "",
      attributes: {
        viewBox,
        ...(svgRoot.attributes.preserveAspectRatio
          ? { preserveAspectRatio: svgRoot.attributes.preserveAspectRatio }
          : {}),
      },
      children: rasterImages,
    },
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height,
  )
}

function createSafeRasterImage(image: SvgObject): SvgObject | undefined {
  const imageUrl = image.attributes.href ?? image.attributes["xlink:href"]
  if (!imageUrl || !/^data:image\/(?:png|jpe?g|gif|webp);/iu.test(imageUrl)) {
    return undefined
  }

  const attributes: Record<string, string> = { href: imageUrl }
  for (const attributeName of SAFE_IMAGE_ATTRIBUTES) {
    const attributeValue = image.attributes[attributeName]
    if (attributeValue !== undefined) attributes[attributeName] = attributeValue
  }

  return {
    name: "image",
    type: "element",
    value: "",
    attributes,
    children: [],
  }
}

function decodeSvgDataUrl(svgDataUrl: string): string | undefined {
  const match = svgDataUrl.match(/^data:image\/svg\+xml([^,]*),(.*)$/isu)
  if (!match) return undefined

  const metadata = match[1]?.toLowerCase() ?? ""
  const payload = match[2] ?? ""
  try {
    if (!metadata.split(";").includes("base64")) {
      return decodeURIComponent(payload)
    }
    const binary = atob(payload.replace(/\s+/gu, ""))
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )
    return new TextDecoder().decode(bytes)
  } catch {
    return undefined
  }
}
