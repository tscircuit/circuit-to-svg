import { expect, test } from "bun:test"
import { offsetOverlappingSchPinLabels } from "lib/sch/svg-object-fns/offset-overlapping-sch-pin-labels"
import type { SvgObject } from "lib/svg-object"

const createLabel = ({
  value,
  x,
  y,
  fontSize = 10,
  transform = "",
}: {
  value: string
  x: number
  y: number
  fontSize?: number
  transform?: string
}): SvgObject => ({
  name: "text",
  type: "element",
  attributes: {
    x: x.toString(),
    y: y.toString(),
    "font-size": `${fontSize}px`,
    transform,
  },
  children: [
    {
      name: "",
      type: "text",
      value,
      attributes: {},
      children: [],
    },
  ],
  value: "",
})

test("keeps non-overlapping custom-symbol labels in place", () => {
  const labels = [
    { label: createLabel({ value: "A", x: 10, y: 10 }), side: "left" },
    { label: createLabel({ value: "B", x: 10, y: 40 }), side: "left" },
  ] as const

  const result = offsetOverlappingSchPinLabels([...labels])

  expect(result.map((label) => label.attributes.y)).toEqual(["10", "40"])
})

test("offsets only the later label when custom-symbol labels overlap", () => {
  const labels = [
    { label: createLabel({ value: "FIRST", x: 10, y: 10 }), side: "left" },
    { label: createLabel({ value: "SECOND", x: 10, y: 10 }), side: "left" },
  ] as const

  const result = offsetOverlappingSchPinLabels([...labels])

  expect(result[0]?.attributes.y).toBe("10")
  expect(result[1]?.attributes.y).toBe("-1")
})

test("updates the rotation origin when offsetting vertical labels", () => {
  const labels = [
    {
      label: createLabel({
        value: "FIRST",
        x: 10,
        y: 10,
        transform: "rotate(-90 10 10)",
      }),
      side: "top",
    },
    {
      label: createLabel({
        value: "SECOND",
        x: 10,
        y: 10,
        transform: "rotate(-90 10 10)",
      }),
      side: "top",
    },
  ] as const

  const result = offsetOverlappingSchPinLabels([...labels])

  expect(result[0]?.attributes.x).toBe("10")
  expect(result[1]?.attributes.x).toBe("-1")
  expect(result[1]?.attributes.transform).toBe("rotate(-90 -1 10)")
})
