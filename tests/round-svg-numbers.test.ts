import { test, expect } from "bun:test"
import { roundSvgNumbers } from "lib/utils/round-svg-numbers"
import type { SvgObject } from "lib/svg-object"

test("roundSvgNumbers rounds numeric attributes", () => {
  const svg: SvgObject = {
    name: "svg",
    type: "element",
    attributes: { width: "100", height: "100" },
    children: [
      {
        name: "circle",
        type: "element",
        attributes: { cx: "10.123", cy: "20.567", r: "5" },
        children: [],
        value: "",
      },
      {
        name: "path",
        type: "element",
        attributes: { d: "M 0.123 0.567 L 1.234 2.345" },
        children: [],
        value: "",
      },
    ],
    value: "",
  }

  roundSvgNumbers(svg)

  const circle = svg.children[0]!
  expect(circle.attributes.cx).toBe("10.1")
  expect(circle.attributes.cy).toBe("20.6")
  expect(circle.attributes.r).toBe("5")

  const path = svg.children[1]!
  expect(path.attributes.d).toBe("M 0.1 0.6 L 1.2 2.3")
})
