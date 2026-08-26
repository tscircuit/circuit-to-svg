import type { SchematicGraphic } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { ensureElementNode, formatNumber } from "lib/utils/svg-object-utils"
import postcss, { type Declaration, type Rule } from "postcss"
import selectorParser from "postcss-selector-parser"
import valueParser from "postcss-value-parser"
import { parseSync } from "svgson"

interface GraphicViewport {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_SVG_WIDTH = 300
const DEFAULT_SVG_HEIGHT = 150

const BLOCKED_ELEMENTS = new Set([
  "animate",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "audio",
  "base",
  "canvas",
  "discard",
  "embed",
  "foreignobject",
  "handler",
  "iframe",
  "link",
  "listener",
  "object",
  "script",
  "set",
  "video",
])

const SPACE_SEPARATED_ID_REFERENCE_ATTRIBUTES = new Set([
  "aria-describedby",
  "aria-labelledby",
  "headers",
])

const SINGLE_ID_REFERENCE_ATTRIBUTES = new Set(["for"])

const BLOCKED_CSS_PROPERTIES = new Set([
  "-moz-binding",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "behavior",
  "pointer-events",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
])

/**
 * Parse, sanitize, and position a schematic graphic as a nested SVG. The
 * wrapper scopes selectors from every graphic, while IDs, classes, and
 * references are rewritten so multiple source documents can safely reuse the
 * same names.
 */
export function createSvgObjectFromSchematicGraphic({
  schematicGraphic,
  viewport,
}: {
  schematicGraphic: SchematicGraphic
  viewport: GraphicViewport
}): SvgObject {
  const sourceSvg = parseSchematicGraphicSvg(schematicGraphic)
  sourceSvg.name = "svg"
  ensureSourceViewBox(sourceSvg)

  const namespace = createNamespace(schematicGraphic.schematic_graphic_id)
  sanitizeSvgTree(sourceSvg, namespace)

  const preserveAspectRatio =
    sourceSvg.attributes.preserveAspectRatio?.trim() || "xMidYMid meet"
  const rootStyle = sourceSvg.attributes.style
  for (const attributeName of Object.keys(sourceSvg.attributes)) {
    if (getLocalName(attributeName) === "transform") {
      delete sourceSvg.attributes[attributeName]
    }
  }
  sourceSvg.attributes = {
    ...sourceSvg.attributes,
    x: formatNumber(viewport.x),
    y: formatNumber(viewport.y),
    width: formatNumber(viewport.width),
    height: formatNumber(viewport.height),
    preserveAspectRatio,
    overflow: "hidden",
    style: createFittedRootStyle(rootStyle, viewport),
  }
  delete sourceSvg.attributes.xmlns

  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      class: `schematic-graphic ${namespace}`,
      "pointer-events": "none",
      "data-circuit-json-type": "schematic_graphic",
      "data-schematic-graphic-id": schematicGraphic.schematic_graphic_id,
      ...(schematicGraphic.schematic_sheet_id
        ? {
            "data-schematic-sheet-id": schematicGraphic.schematic_sheet_id,
          }
        : {}),
    },
    children: [sourceSvg],
  }
}

function parseSchematicGraphicSvg(
  schematicGraphic: SchematicGraphic,
): SvgObject {
  const errorPrefix = `Unable to render schematic graphic "${schematicGraphic.schematic_graphic_id}"`

  const source = getSchematicGraphicSvgSource(schematicGraphic, errorPrefix)

  let sourceSvg: SvgObject
  try {
    sourceSvg = ensureElementNode(parseSync(source.content))
  } catch (cause) {
    throw new Error(`${errorPrefix}: ${source.label} is not valid SVG`, {
      cause,
    })
  }

  if (getLocalName(sourceSvg.name) !== "svg") {
    throw new Error(`${errorPrefix}: ${source.label} must have an <svg> root`)
  }

  return sourceSvg
}

function getSchematicGraphicSvgSource(
  schematicGraphic: SchematicGraphic,
  errorPrefix: string,
): { content: string; label: "asset.url" | "svg_content" } {
  // The cast keeps the renderer tolerant of Circuit JSON emitted before asset
  // became required. New producers should always provide the canonical asset.
  const asset = (
    schematicGraphic as {
      asset?: SchematicGraphic["asset"]
    }
  ).asset

  if (!asset) {
    if (schematicGraphic.svg_content !== undefined) {
      return { content: schematicGraphic.svg_content, label: "svg_content" }
    }
    throw new Error(`${errorPrefix}: asset is required`)
  }

  if (getMediaType(asset.mimetype) !== "image/svg+xml") {
    throw new Error(
      `${errorPrefix}: asset.mimetype must be "image/svg+xml" (received ${JSON.stringify(asset.mimetype)})`,
    )
  }

  const assetUrl = asset.url.trim()
  if (assetUrl.toLowerCase().startsWith("data:")) {
    return {
      content: decodeSvgDataUrl(assetUrl, errorPrefix),
      label: "asset.url",
    }
  }

  // convertCircuitJsonToSchematicSvg is synchronous, so callers resolving a
  // file or remote asset may attach its already-loaded text as svg_content.
  if (schematicGraphic.svg_content !== undefined) {
    return { content: schematicGraphic.svg_content, label: "svg_content" }
  }

  throw new Error(
    `${errorPrefix}: asset.url must be an inline SVG data URL because circuit-to-svg cannot synchronously load ${JSON.stringify(asset.url)}`,
  )
}

function decodeSvgDataUrl(dataUrl: string, errorPrefix: string): string {
  const match = dataUrl.match(/^data:([^,]*),(.*)$/is)
  if (!match) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`)
  }

  const metadata = match[1]!
  const payload = match[2]!
  const metadataParts = metadata.split(";").map((part) => part.trim())
  const dataUrlMediaType = getMediaType(metadataParts.shift() ?? "")
  if (dataUrlMediaType !== "image/svg+xml") {
    throw new Error(
      `${errorPrefix}: asset.url must use the "image/svg+xml" media type`,
    )
  }

  const isBase64 = metadataParts.some((part) => part.toLowerCase() === "base64")

  try {
    if (!isBase64) return decodeURIComponent(payload)

    const encoded = payload.replace(/\s+/g, "")
    if (
      !/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(encoded)
    ) {
      throw new Error("invalid base64")
    }
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )
    return new TextDecoder().decode(bytes)
  } catch (cause) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`, {
      cause,
    })
  }
}

function getMediaType(value: string): string {
  return (value.split(";", 1)[0] ?? "").trim().toLowerCase()
}

/**
 * A nested SVG needs a viewBox to scale intrinsic coordinate values when its
 * outer width and height are replaced with the sheet viewport. Most exported
 * SVG documents already provide one. For documents that only specify intrinsic
 * dimensions, derive it from those lengths and use the browser's 300x150 SVG
 * fallback for dimensions that cannot be resolved (for example percentages).
 */
function ensureSourceViewBox(sourceSvg: SvgObject): void {
  if (sourceSvg.attributes.viewBox?.trim()) return

  const width = parseAbsoluteSvgLength(sourceSvg.attributes.width)
  const height = parseAbsoluteSvgLength(sourceSvg.attributes.height)
  sourceSvg.attributes.viewBox = `0 0 ${width ?? DEFAULT_SVG_WIDTH} ${height ?? DEFAULT_SVG_HEIGHT}`
}

function parseAbsoluteSvgLength(value: string | undefined): number | undefined {
  if (!value) return undefined

  const match = value.match(
    /^\s*([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|in|cm|mm|q|pt|pc)?\s*$/i,
  )
  if (!match) return undefined

  const numericValue = Number(match[1])
  if (!Number.isFinite(numericValue) || numericValue <= 0) return undefined

  const unitToPx: Record<string, number> = {
    px: 1,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    q: 96 / 101.6,
    pt: 96 / 72,
    pc: 16,
  }

  return numericValue * unitToPx[(match[2] ?? "px").toLowerCase()]!
}

function sanitizeSvgTree(root: SvgObject, namespace: string): void {
  sanitizeElement(root, namespace)
}

function sanitizeElement(node: SvgObject, namespace: string): void {
  node.attributes ??= {}
  const elementName = getLocalName(node.name)

  for (const [attributeName, attributeValue] of Object.entries(
    node.attributes,
  )) {
    const localName = getLocalName(attributeName)

    if (localName.startsWith("on")) {
      delete node.attributes[attributeName]
      continue
    }

    if (localName === "base") {
      delete node.attributes[attributeName]
      continue
    }

    if (localName === "pointer-events") {
      delete node.attributes[attributeName]
      continue
    }

    if (localName === "id") {
      node.attributes[attributeName] = namespaceId(namespace, attributeValue)
      continue
    }

    if (localName === "class") {
      const namespacedClasses = attributeValue
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((className) => namespaceClass(namespace, className))
        .join(" ")
      if (namespacedClasses) {
        node.attributes[attributeName] = namespacedClasses
      } else {
        delete node.attributes[attributeName]
      }
      continue
    }

    if (localName === "href" || localName === "src" || localName === "poster") {
      const fragment = parseLocalFragment(attributeValue)
      if (fragment !== undefined) {
        node.attributes[attributeName] = `#${namespaceId(namespace, fragment)}`
      } else if (
        (elementName === "image" || elementName === "feimage") &&
        isSafeRasterDataUrl(attributeValue)
      ) {
        node.attributes[attributeName] = attributeValue.trim()
      } else {
        delete node.attributes[attributeName]
      }
      continue
    }

    if (SPACE_SEPARATED_ID_REFERENCE_ATTRIBUTES.has(localName)) {
      node.attributes[attributeName] = attributeValue
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => namespaceId(namespace, id))
        .join(" ")
      continue
    }

    if (SINGLE_ID_REFERENCE_ATTRIBUTES.has(localName)) {
      node.attributes[attributeName] = namespaceId(
        namespace,
        attributeValue.trim(),
      )
      continue
    }

    if (localName === "style") {
      const sanitizedStyle = sanitizeInlineStyle(attributeValue, namespace)
      if (sanitizedStyle) {
        node.attributes[attributeName] = sanitizedStyle
      } else {
        delete node.attributes[attributeName]
      }
      continue
    }

    if (attributeValue.includes("\\") || hasUnsafeCssTokens(attributeValue)) {
      delete node.attributes[attributeName]
      continue
    }

    if (/url\s*\(/i.test(attributeValue)) {
      const sanitizedValue = sanitizeCssValue(attributeValue, namespace)
      if (sanitizedValue === undefined) {
        delete node.attributes[attributeName]
      } else {
        node.attributes[attributeName] = sanitizedValue
      }
    }
  }

  const sanitizedChildren: SvgObject[] = []
  for (const child of node.children ?? []) {
    if (child.type !== "element") {
      sanitizedChildren.push(child)
      continue
    }

    const localName = getLocalName(child.name)
    if (BLOCKED_ELEMENTS.has(localName)) continue

    if (localName === "style") {
      const sanitizedCss = sanitizeStyleSheet(getTextContent(child), namespace)
      if (!sanitizedCss) continue

      child.attributes = {}
      child.children = [createTextNode(sanitizedCss)]
      sanitizedChildren.push(child)
      continue
    }

    sanitizeElement(child, namespace)
    sanitizedChildren.push(child)
  }
  node.children = sanitizedChildren
}

function sanitizeStyleSheet(css: string, namespace: string): string {
  try {
    const root = postcss.parse(css)

    // At-rules can escape the graphic's selector scope (@import, @font-face),
    // mutate it (@keyframes), or alter global cascade behavior (@layer). Static
    // block diagrams do not need them, so remove them all.
    root.walkAtRules((atRule) => {
      atRule.remove()
    })

    root.walkRules((rule) => {
      const selector = scopeSelector(rule.selector, namespace)
      if (!selector) {
        rule.remove()
        return
      }

      rule.selector = selector
      sanitizeDeclarations(rule, namespace)
      if (!rule.nodes?.some((node) => node.type === "decl")) rule.remove()
    })

    root.walkComments((comment) => {
      comment.remove()
    })
    return root.toString().trim()
  } catch {
    return ""
  }
}

function sanitizeInlineStyle(style: string, namespace: string): string {
  try {
    const root = postcss.parse(`x{${style}}`)
    if (root.nodes.length !== 1 || root.nodes[0]?.type !== "rule") return ""

    const rule = root.nodes[0]
    if (rule.selector !== "x") return ""

    sanitizeDeclarations(rule, namespace)
    return (
      rule.nodes
        ?.filter((node): node is Declaration => node.type === "decl")
        .map((declaration) => declaration.toString())
        .join(";") ?? ""
    )
  } catch {
    return ""
  }
}

function sanitizeDeclarations(rule: Rule, namespace: string): void {
  rule.walkDecls((declaration) => {
    const property = declaration.prop.toLowerCase()
    if (
      declaration.prop.includes("\\") ||
      declaration.value.includes("\\") ||
      /var\s*\(/i.test(declaration.value) ||
      property.startsWith("--") ||
      BLOCKED_CSS_PROPERTIES.has(property) ||
      property.startsWith("animation-") ||
      property.startsWith("transition-")
    ) {
      declaration.remove()
      return
    }

    const sanitizedValue = sanitizeCssValue(declaration.value, namespace)
    if (sanitizedValue === undefined) {
      declaration.remove()
    } else {
      declaration.value = sanitizedValue
    }
  })
}

function scopeSelector(selector: string, namespace: string): string {
  try {
    return selectorParser((selectors) => {
      selectors.walkIds((id) => {
        id.value = namespaceId(namespace, id.value)
      })
      selectors.walkClasses((className) => {
        className.value = namespaceClass(namespace, className.value)
      })
      selectors.walkPseudos((pseudo) => {
        if (pseudo.value.toLowerCase() === ":root") {
          pseudo.replaceWith(selectorParser.tag({ value: "svg" }))
        }
      })

      selectors.each((singleSelector) => {
        singleSelector.prepend(selectorParser.combinator({ value: " " }))
        singleSelector.prepend(selectorParser.className({ value: namespace }))
      })
    }).processSync(selector)
  } catch {
    return ""
  }
}

function sanitizeCssValue(
  cssValue: string,
  namespace: string,
): string | undefined {
  if (cssValue.includes("\\") || hasUnsafeCssTokens(cssValue)) {
    return undefined
  }

  let isSafe = true
  const parsed = valueParser(cssValue)
  parsed.walk((node) => {
    if (node.type !== "function") return
    const functionName = node.value.toLowerCase()
    if (
      functionName === "attr" ||
      functionName === "cross-fade" ||
      functionName === "element" ||
      functionName === "env" ||
      functionName === "image" ||
      functionName === "image-set" ||
      functionName === "paint" ||
      functionName === "src" ||
      functionName === "var" ||
      functionName === "-webkit-image-set"
    ) {
      isSafe = false
      return false
    }
    if (functionName !== "url") return
    if ((node as { unclosed?: boolean }).unclosed) {
      isSafe = false
      return false
    }

    const rawUrl = valueParser.stringify(node.nodes).trim()
    const unquotedUrl = stripMatchingQuotes(rawUrl)
    const fragment = parseLocalFragment(unquotedUrl)
    if (fragment === undefined) {
      isSafe = false
      return false
    }

    node.nodes = [
      {
        type: "word",
        value: `#${namespaceId(namespace, fragment)}`,
        sourceIndex: 0,
        sourceEndIndex: 0,
      },
    ]
  })

  return isSafe ? parsed.toString() : undefined
}

function parseLocalFragment(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed.startsWith("#") || trimmed.length < 2) return undefined
  return trimmed.slice(1)
}

function stripMatchingQuotes(value: string): string {
  const first = value[0]
  if ((first === '"' || first === "'") && value.at(-1) === first) {
    return value.slice(1, -1).trim()
  }
  return value
}

function createNamespace(schematicGraphicId: string): string {
  return `schematic-graphic-${encodeAsHex(schematicGraphicId)}`
}

function namespaceId(namespace: string, sourceId: string): string {
  return `${namespace}--${encodeAsHex(sourceId)}`
}

function namespaceClass(namespace: string, sourceClass: string): string {
  return `${namespace}--class-${encodeAsHex(sourceClass)}`
}

function isSafeRasterDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpeg);base64,[a-z\d+/=\s]+$/i.test(value.trim())
}

function hasUnsafeCssTokens(value: string): boolean {
  return (
    /(?:javascript|https?|ftp|file|data|blob)\s*:/i.test(value) ||
    /(^|[^:])\/\//.test(value) ||
    /(?:expression|var|attr|env|image-set|-webkit-image-set|cross-fade|element|paint|src)\s*\(/i.test(
      value,
    )
  )
}

function createFittedRootStyle(
  sourceStyle: string | undefined,
  viewport: GraphicViewport,
): string {
  const x = formatNumber(viewport.x)
  const y = formatNumber(viewport.y)
  const width = formatNumber(viewport.width)
  const height = formatNumber(viewport.height)

  return [
    sourceStyle,
    `x:${x}px!important`,
    `y:${y}px!important`,
    `width:${width}px!important`,
    `height:${height}px!important`,
    "min-width:0!important",
    "min-height:0!important",
    "max-width:none!important",
    "max-height:none!important",
    "position:static!important",
    "inset:auto!important",
    "margin:0!important",
    "transform:none!important",
    "transform-origin:initial!important",
    "translate:none!important",
    "rotate:none!important",
    "scale:none!important",
    "overflow:hidden!important",
  ]
    .filter(Boolean)
    .join(";")
}

function encodeAsHex(value: string): string {
  const bytes = new TextEncoder().encode(value)
  if (bytes.length === 0) return "empty"
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  )
}

function getTextContent(node: SvgObject): string {
  return (node.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => child.value)
    .join("")
}

function createTextNode(value: string): SvgObject {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }
}

function getLocalName(name: string): string {
  return (name.split(":").at(-1) ?? name).toLowerCase()
}
