import base64Font from "@tscircuit/alphabet/base64font"
import { type INode, stringify } from "svgson"

export const ALPHABET_FONT_FAMILY = "TscircuitAlphabet"
const FONT_STYLE_ATTRIBUTE = "data-tscircuit-alphabet-font"

/** Embed the font once per document, including composed SVGs. */
export function stringifySvg(svg: INode): string {
  const withoutEmbeddedFont = (node: INode): INode => ({
    ...node,
    children: (node.children ?? [])
      .filter((child) => !(FONT_STYLE_ATTRIBUTE in (child.attributes ?? {})))
      .map(withoutEmbeddedFont),
  })
  const root = withoutEmbeddedFont(svg)
  root.children.push({
    name: "style",
    type: "element",
    value: "",
    attributes: { [FONT_STYLE_ATTRIBUTE]: "", type: "text/css" },
    children: [
      {
        name: "",
        type: "text",
        value: `@font-face { font-family: '${ALPHABET_FONT_FAMILY}'; src: url('data:font/ttf;base64,${base64Font}') format('truetype'); font-weight: normal; font-style: normal; }`,
        attributes: {},
        children: [],
      },
    ],
  })
  return stringify(root)
}
