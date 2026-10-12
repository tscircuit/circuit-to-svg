import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToAssemblySvg } from "lib"
import { type INode, parseSync, stringify } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const createCase = (rotation: number, layer: "top" | "bottom") => {
  const { circuit } = getTestFixture()
  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        footprint="dip4"
        pcbX={1}
        pcbY={-1}
        pcbRotation={rotation}
        layer={layer}
      />
    </board>,
  )
  const circuitJson = circuit.getCircuitJson()
  const component = circuitJson.find(
    (element) => element.type === "pcb_component",
  )
  if (!component || component.type !== "pcb_component")
    throw new Error("Missing component")
  const firstPort = circuitJson.find(
    (element) =>
      element.type === "pcb_port" &&
      element.pcb_component_id === component.pcb_component_id,
  )
  if (!firstPort || firstPort.type !== "pcb_port")
    throw new Error("Missing first port")
  return {
    component,
    firstPort,
    svg: convertCircuitJsonToAssemblySvg([...circuitJson], {
      width: 600,
      height: 600,
    }),
  }
}
const findParent = (node: INode, className: string): INode | undefined => {
  if (node.children.some((child) => child.attributes.class === className))
    return node
  for (const child of node.children) {
    const found = findParent(child, className)
    if (found) return found
  }
  return undefined
}
const measure = (svg: string, className: string) => {
  const root = parseSync(svg)
  const parent = findParent(root, className)
  if (!parent) throw new Error(`Missing ${className}`)
  parent.children = parent.children.filter(
    (child) => child.attributes.class === className,
  )
  if (className === "assembly-component") {
    for (const outline of parent.children)
      outline.attributes.style = "fill: #000; stroke: none"
  }
  root.children = [
    ...root.children.filter((child) => child.name === "style"),
    parent,
  ]
  const image = new Resvg(stringify(root), {
    font: { loadSystemFonts: false },
  }).render()
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1
  let sumX = 0
  let sumY = 0
  let weight = 0
  const pixels = image.pixels
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = pixels[(y * image.width + x) * 4 + 3] ?? 0
      if (!alpha) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      sumX += (x + 0.5) * alpha
      sumY += (y + 0.5) * alpha
      weight += alpha
    }
  }
  if (!weight) throw new Error(`No rendered ${className}`)
  return { minX, minY, maxX, maxY, x: sumX / weight, y: sumY / weight }
}
for (const layer of ["top", "bottom"] as const) {
  for (const rotation of [0, 45, 90, 180, -45, -90]) {
    test(`pin marker stays in the component and near pin one at ${rotation} degrees on ${layer}`, () => {
      const { svg, component, firstPort } = createCase(rotation, layer)
      const body = measure(svg, "assembly-component")
      const marker = measure(svg, "assembly-pin1-indicator")
      expect(marker.minX).toBeGreaterThanOrEqual(body.minX - 1)
      expect(marker.minY).toBeGreaterThanOrEqual(body.minY - 1)
      expect(marker.maxX).toBeLessThanOrEqual(body.maxX + 1)
      expect(marker.maxY).toBeLessThanOrEqual(body.maxY + 1)
      const scale = 600 / 22
      const portX = 300 + firstPort.x * scale
      const portY = 300 - firstPort.y * scale
      const inset = Math.min(component.width, component.height) / 12
      const cornerDistances: number[] = []
      for (const signX of [-1, 1]) {
        for (const signY of [-1, 1]) {
          const x =
            300 +
            (component.center.x + signX * (component.width / 2 - inset)) * scale
          const y =
            300 -
            (component.center.y + signY * (component.height / 2 - inset)) *
              scale
          cornerDistances.push(Math.hypot(x - portX, y - portY))
        }
      }
      const distance = Math.hypot(marker.x - portX, marker.y - portY)
      expect(
        Math.abs(distance - Math.min(...cornerDistances)),
      ).toBeLessThanOrEqual(1)
    })
  }
}
test("shows top and bottom rotated pin-one indicators", () => {
  expect(createCase(90, "top").svg).toMatchSvgSnapshot(
    import.meta.path,
    "assembly-pin-indicator-top",
  )
  expect(createCase(45, "bottom").svg).toMatchSvgSnapshot(
    import.meta.path,
    "assembly-pin-indicator-bottom",
  )
})
