import { expect, test } from "bun:test"
import type { AnyCircuitElement, PCBVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromPcbVia } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-via"
import { parseSync, type INode } from "svgson"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "negative-length-board",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  material: "fr4",
  num_layers: 2,
}
const pixelsPerMillimeter = 400 / 22

function render(element: AnyCircuitElement, showSolderMask = false): INode {
  return parseSync(
    convertCircuitJsonToPcbSvg([board, element], {
      width: 400,
      height: 400,
      showSolderMask,
    }),
  )
}

function elementsWithClass(root: INode, className: string): INode[] {
  const matches: INode[] = []
  function visit(node: INode): void {
    if (node.attributes.class?.split(/\s+/).includes(className)) {
      matches.push(node)
    }
    for (const child of node.children) visit(child)
  }
  visit(root)
  return matches
}

const cases: Array<{
  name: string
  make: (sign: number) => AnyCircuitElement
  shapes: Array<{
    className: string
    count: number
    lengths: string[]
    expectedPositive: number[]
  }>
}> = [
  {
    name: "via",
    make: (sign) => ({
      type: "pcb_via",
      pcb_via_id: "via",
      x: 3,
      y: -2,
      outer_diameter: sign * 2,
      hole_diameter: sign,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    }),
    shapes: [
      {
        className: "pcb-hole-outer",
        count: 1,
        lengths: ["r"],
        expectedPositive: [1],
      },
      {
        className: "pcb-hole-inner",
        count: 1,
        lengths: ["r"],
        expectedPositive: [0.5],
      },
    ],
  },
  {
    name: "circular plated hole",
    make: (sign) => ({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated-hole",
      shape: "circle",
      x: 3,
      y: -2,
      outer_diameter: sign * 2,
      hole_diameter: sign,
      layers: ["top", "bottom"],
    }),
    shapes: [
      {
        className: "pcb-hole-outer",
        count: 1,
        lengths: ["r"],
        expectedPositive: [1],
      },
      {
        className: "pcb-hole-inner",
        count: 1,
        lengths: ["r"],
        expectedPositive: [0.5],
      },
    ],
  },
  {
    name: "oval plated hole",
    make: (sign) => ({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "oval-plated-hole",
      shape: "oval",
      x: 3,
      y: -2,
      outer_width: sign * 2,
      outer_height: sign,
      hole_width: sign,
      hole_height: sign * 0.5,
      ccw_rotation: 0,
      layers: ["top", "bottom"],
    }),
    shapes: [
      {
        className: "pcb-hole-outer",
        count: 1,
        lengths: ["rx", "ry"],
        expectedPositive: [1, 0.5],
      },
      {
        className: "pcb-hole-inner",
        count: 1,
        lengths: ["rx", "ry"],
        expectedPositive: [0.5, 0.25],
      },
    ],
  },
  {
    name: "circular hole",
    make: (sign) => ({
      type: "pcb_hole",
      pcb_hole_id: "circle-hole",
      hole_shape: "circle",
      x: 3,
      y: -2,
      hole_diameter: sign * 2,
    }),
    shapes: [
      {
        className: "pcb-hole",
        count: 1,
        lengths: ["r"],
        expectedPositive: [1],
      },
    ],
  },
  {
    name: "square hole",
    make: (sign) => ({
      type: "pcb_hole",
      pcb_hole_id: "square-hole",
      hole_shape: "square",
      x: 3,
      y: -2,
      hole_diameter: sign * 2,
    }),
    shapes: [
      {
        className: "pcb-hole",
        count: 1,
        lengths: ["width", "height"],
        expectedPositive: [2, 2],
      },
    ],
  },
  {
    name: "oval hole",
    make: (sign) => ({
      type: "pcb_hole",
      pcb_hole_id: "oval-hole",
      hole_shape: "oval",
      x: 3,
      y: -2,
      hole_width: sign * 2,
      hole_height: sign,
    }),
    shapes: [
      {
        className: "pcb-hole",
        count: 1,
        lengths: ["rx", "ry"],
        expectedPositive: [1, 0.5],
      },
    ],
  },
  {
    name: "rectangular hole",
    make: (sign) => ({
      type: "pcb_hole",
      pcb_hole_id: "rect-hole",
      hole_shape: "rect",
      x: 3,
      y: -2,
      hole_width: sign * 2,
      hole_height: sign,
    }),
    shapes: [
      {
        className: "pcb-hole",
        count: 1,
        lengths: ["width", "height"],
        expectedPositive: [2, 1],
      },
    ],
  },
  {
    name: "circular keepout",
    make: (sign) => ({
      type: "pcb_keepout",
      pcb_keepout_id: "keepout",
      shape: "circle",
      center: { x: 3, y: -2 },
      radius: sign,
      layers: ["top"],
    }),
    shapes: [
      {
        className: "pcb-keepout-circle",
        count: 2,
        lengths: ["r"],
        expectedPositive: [1],
      },
    ],
  },
]

for (const { name, make, shapes } of cases) {
  test(`${name}: negative lengths clamp to zero without removing or moving shapes`, () => {
    const negative = render(make(-1))
    const zero = render(make(0))
    const positive = render(make(1))

    for (const { className, count, lengths, expectedPositive } of shapes) {
      const negativeShapes = elementsWithClass(negative, className)
      const zeroShapes = elementsWithClass(zero, className)
      const positiveShapes = elementsWithClass(positive, className)
      expect(negativeShapes).toHaveLength(count)
      expect(zeroShapes).toHaveLength(count)
      expect(positiveShapes).toHaveLength(count)

      for (let index = 0; index < count; index++) {
        const negativeShape = negativeShapes[index]
        const zeroShape = zeroShapes[index]
        const positiveShape = positiveShapes[index]
        if (!negativeShape || !zeroShape || !positiveShape) {
          throw new Error(`Missing ${className} shape`)
        }
        expect(negativeShape.name).toBe(zeroShape.name)
        for (const coordinate of ["cx", "cy", "x", "y"]) {
          if (zeroShape.attributes[coordinate] !== undefined) {
            expect(negativeShape.attributes[coordinate]).toBe(
              zeroShape.attributes[coordinate],
            )
          }
        }
        for (const [lengthIndex, length] of lengths.entries()) {
          expect(negativeShape.attributes[length]).toBe("0")
          expect(zeroShape.attributes[length]).toBe("0")
          expect(Number(positiveShape.attributes[length])).toBeCloseTo(
            (expectedPositive[lengthIndex] ?? 0) * pixelsPerMillimeter,
          )
        }
      }
    }
  })
}

test("circular hole and plated hole mask radii stay nonnegative", () => {
  const makeCircle = (type: "pcb_hole" | "pcb_plated_hole") =>
    type === "pcb_hole"
      ? ({
          type,
          pcb_hole_id: "masked-hole",
          hole_shape: "circle",
          x: 3,
          y: -2,
          hole_diameter: -2,
          soldermask_margin: -1,
          is_covered_with_solder_mask: true,
        } as AnyCircuitElement)
      : ({
          type,
          pcb_plated_hole_id: "masked-plated-hole",
          shape: "circle",
          x: 3,
          y: -2,
          outer_diameter: -2,
          hole_diameter: -1,
          soldermask_margin: -1,
          is_covered_with_solder_mask: true,
          layers: ["top", "bottom"],
        } as AnyCircuitElement)

  for (const type of ["pcb_hole", "pcb_plated_hole"] as const) {
    const svg = render(makeCircle(type), true)
    const classes =
      type === "pcb_hole"
        ? ["pcb-hole-covered", "pcb-hole-exposed"]
        : ["pcb-hole-outer-covered", "pcb-hole-outer-exposed", "pcb-hole-inner"]
    for (const className of classes) {
      const shapes = elementsWithClass(svg, className)
      expect(shapes).toHaveLength(1)
      expect(shapes[0]?.attributes.r).toBe("0")
    }
  }
})

test("negative PCB center coordinates remain negative", () => {
  const via = {
    type: "pcb_via",
    pcb_via_id: "negative-center-via",
    x: -3,
    y: -2,
    outer_diameter: -2,
    hole_diameter: -1,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  } as PCBVia
  const objects = createSvgObjectsFromPcbVia(via, {
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    colorMap: DEFAULT_PCB_COLOR_MAP,
  })
  const circles = objects[0]?.children.filter(
    (child) => child.name === "circle",
  )
  expect(circles).toHaveLength(2)
  for (const circle of circles ?? []) {
    expect(circle.attributes.cx).toBe("-3")
    expect(circle.attributes.cy).toBe("-2")
    expect(circle.attributes.r).toBe("0")
  }
})

for (const holeShape of ["oval", "rect"] as const) {
  test(`${holeShape} hole mask lengths clamp while the hole stays present`, () => {
    const hole = {
      type: "pcb_hole",
      pcb_hole_id: `masked-${holeShape}`,
      hole_shape: holeShape,
      x: 3,
      y: -2,
      hole_width: 1,
      hole_height: 1,
      soldermask_margin: -1,
      is_covered_with_solder_mask: true,
    } as AnyCircuitElement
    const svg = render(hole, true)
    const covered = elementsWithClass(svg, "pcb-hole-covered")
    const exposed = elementsWithClass(svg, "pcb-hole-exposed")
    const lengths = holeShape === "oval" ? ["rx", "ry"] : ["width", "height"]

    expect(covered).toHaveLength(1)
    expect(exposed).toHaveLength(1)
    expect(covered[0]?.name).toBe(holeShape === "oval" ? "ellipse" : "rect")
    expect(exposed[0]?.name).toBe(covered[0]?.name)
    for (const length of lengths) {
      expect(Number(covered[0]?.attributes[length])).toBeGreaterThan(0)
      expect(exposed[0]?.attributes[length]).toBe("0")
    }
    if (holeShape === "oval") {
      expect(exposed[0]?.attributes.cx).toBe(covered[0]?.attributes.cx)
      expect(exposed[0]?.attributes.cy).toBe(covered[0]?.attributes.cy)
    }
  })
}
