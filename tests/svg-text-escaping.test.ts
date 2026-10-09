import { expect, test } from "bun:test"
import { stringifySvg } from "lib/utils/stringify-svg"
import {
  svgElement,
  textNode,
} from "lib/sim/simulation-graph-svg/simulation-graph-svg-shared"
import { parseSync } from "svgson"

test("literal text with repeated CDATA terminators round trips and renders", () => {
  const labels = [
    "Ordinary label: voltage < current & reference > ground",
    'Two terminators: ]]> ]]> & "quoted" text',
    "Three adjacent terminators: ]]>]]>]]> <script>literal text</script>",
  ]
  const root = svgElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "720",
      height: "160",
    },
    [
      svgElement("rect", { width: "720", height: "160", fill: "white" }),
      ...labels.map((label, index) =>
        svgElement(
          "text",
          {
            x: "20",
            y: String(36 + index * 42),
            "font-size": "16",
            "font-family": "sans-serif",
            "data-label": label,
          },
          [textNode(label)],
        ),
      ),
    ],
  )
  const original = JSON.stringify(root)
  const svg = stringifySvg(root)
  const texts = parseSync(svg).children.filter((child) => child.name === "text")
  expect(
    texts.map((text) => text.children.map((child) => child.value).join("")),
  ).toEqual(labels)
  expect(JSON.stringify(root)).toBe(original)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
