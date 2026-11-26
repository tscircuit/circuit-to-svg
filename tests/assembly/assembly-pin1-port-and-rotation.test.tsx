import { expect, test } from "bun:test"
import { cju } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { type INode, parseSync } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

interface SvgPoint {
  x: number
  y: number
}

interface RenderedComponentGeometry {
  corners: SvgPoint[]
  indicatorCorner: SvgPoint
}

function rotateSvgPoint(point: SvgPoint, angleDeg: number): SvgPoint {
  const radians = (Math.PI / 180) * angleDeg
  const cosAngle = Math.cos(radians)
  const sinAngle = Math.sin(radians)
  return {
    x: point.x * cosAngle - point.y * sinAngle,
    y: point.x * sinAngle + point.y * cosAngle,
  }
}

function parseRotateDegrees(transformText: string): number {
  const match = transformText.match(
    /rotate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/i,
  )
  return match ? Number(match[1]) : 0
}

function parsePathCoordinates(pathText: string): SvgPoint[] {
  const matches = pathText.matchAll(
    /[ML]\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)[,\s]+([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/gi,
  )
  return Array.from(matches, (match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

function parseRenderedComponents(
  svg: string,
): Record<string, RenderedComponentGeometry> {
  const root = parseSync(svg)
  const rendered: Record<string, RenderedComponentGeometry> = {}

  for (const child of root.children) {
    if (child.name !== "g") continue
    const translateMatch = (child.attributes.transform ?? "").match(
      /translate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*,\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/i,
    )
    if (!translateMatch) continue
    const center = {
      x: Number(translateMatch[1]),
      y: Number(translateMatch[2]),
    }
    const label = child.children.find(
      (n) =>
        n.name === "text" &&
        (n.attributes.class ?? "").includes("assembly-component-label"),
    )?.children?.[0]?.value
    const rectNode = child.children.find(
      (n) =>
        n.name === "path" &&
        (n.attributes.class ?? "").includes("assembly-component"),
    )
    const polyNode = child.children.find(
      (n) =>
        n.name === "polygon" &&
        (n.attributes.class ?? "").includes("assembly-pin1-indicator"),
    )
    if (!label || !rectNode || !polyNode) continue

    const rectRotation = parseRotateDegrees(rectNode.attributes.transform ?? "")
    const corners = parsePathCoordinates(rectNode.attributes.d ?? "").map(
      (pt) => {
        const rot = rotateSvgPoint(pt, rectRotation)
        return { x: center.x + rot.x, y: center.y - rot.y }
      },
    )
    const vertexParts = (polyNode.attributes.points ?? "")
      .trim()
      .split(/\s+/)[0]
      ?.split(",")
    if (!vertexParts || vertexParts.length < 2) continue
    const rotPoly = rotateSvgPoint(
      { x: Number(vertexParts[0]), y: Number(vertexParts[1]) },
      parseRotateDegrees(polyNode.attributes.transform ?? ""),
    )
    rendered[label] = {
      corners,
      indicatorCorner: { x: center.x + rotPoly.x, y: center.y - rotPoly.y },
    }
  }
  return rendered
}

function findExpectedPin1Corner(context: {
  svg: string
  pcbPoint: SvgPoint
  soup: AnyCircuitElement[]
  corners: SvgPoint[]
}): SvgPoint {
  const root = parseSync(context.svg)
  const boardNode = root.children.find(
    (node: INode) =>
      node.name === "path" &&
      (node.attributes.class ?? "").includes("pcb-board"),
  )
  const boardPts = parsePathCoordinates(boardNode?.attributes.d ?? "")
  const minX = Math.min(...boardPts.map((pt) => pt.x))
  const maxX = Math.max(...boardPts.map((pt) => pt.x))
  const minY = Math.min(...boardPts.map((pt) => pt.y))
  const maxY = Math.max(...boardPts.map((pt) => pt.y))
  const board = cju(context.soup).pcb_board.list()[0]!
  const bw = board.width ?? 1
  const bh = board.height ?? 1
  const target: SvgPoint = {
    x:
      minX +
      ((context.pcbPoint.x - (board.center.x - bw / 2)) / bw) * (maxX - minX),
    y:
      maxY -
      ((context.pcbPoint.y - (board.center.y - bh / 2)) / bh) * (maxY - minY),
  }
  let best = context.corners[0]!
  let bestDist = Number.POSITIVE_INFINITY
  for (const corner of context.corners) {
    const dist = (corner.x - target.x) ** 2 + (corner.y - target.y) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = corner
    }
  }
  return best
}

function expectSameCorner(actual: SvgPoint, expected: SvgPoint) {
  expect(actual.x).toBeCloseTo(expected.x, 3)
  expect(actual.y).toBeCloseTo(expected.y, 3)
}

function createRotatedChipsCircuitJson(): AnyCircuitElement[] {
  const { circuit } = getTestFixture()
  circuit.add(
    <board width="40mm" height="30mm">
      <chip name="U0" footprint="dip4" pcbX={-11} pcbY={7} pcbRotation={0} />
      <chip name="U90" footprint="dip4" pcbX={0} pcbY={7} pcbRotation={90} />
      <chip name="U180" footprint="dip4" pcbX={11} pcbY={7} pcbRotation={180} />
      <chip
        name="U270"
        footprint="dip4"
        pcbX={-11}
        pcbY={-7}
        pcbRotation={270}
      />
      <chip
        name="UBOT"
        footprint="dip4"
        layer="bottom"
        pcbX={0}
        pcbY={-7}
        pcbRotation={90}
      />
      <chip
        name="U8"
        footprint="soic8"
        pinLabels={{ pin1: "VCC", pin2: "IN" }}
        pcbX={11}
        pcbY={-7}
        pcbRotation={90}
      />
    </board>,
  )
  return circuit.getCircuitJson()
}

test("pin-1 indicator sits at rotated component corner closest to pin 1", () => {
  const soup = createRotatedChipsCircuitJson()
  const svg = convertCircuitJsonToAssemblySvg(soup, {})
  const renderedMap = parseRenderedComponents(svg)
  const db = cju(soup)

  for (const comp of db.pcb_component.list()) {
    const sourceComp = db.source_component.get(comp.source_component_id)
    if (!sourceComp) continue
    const rendered = renderedMap[sourceComp.name]
    expect(rendered).toBeDefined()
    if (!rendered) continue
    const pin1Port = db.pcb_port
      .list()
      .filter((port) => port.pcb_component_id === comp.pcb_component_id)
      .find((port) => db.source_port.get(port.source_port_id)?.pin_number === 1)
    expect(pin1Port).toBeDefined()
    if (!pin1Port) continue
    const expectedCorner = findExpectedPin1Corner({
      svg,
      pcbPoint: { x: pin1Port.x, y: pin1Port.y },
      soup,
      corners: rendered.corners,
    })
    expectSameCorner(rendered.indicatorCorner, expectedCorner)
  }

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("pin-1 port resolution ignores pcb_port order and supports pin_number, A1 hint, and pad hint", () => {
  const baseSoup = createRotatedChipsCircuitJson()
  const baseline = parseRenderedComponents(
    convertCircuitJsonToAssemblySvg(baseSoup, {}),
  )
  const nonPorts = baseSoup.filter((elm) => elm.type !== "pcb_port")
  const reversedPorts = cju(baseSoup).pcb_port.list().reverse()

  const reversed = parseRenderedComponents(
    convertCircuitJsonToAssemblySvg([...nonPorts, ...reversedPorts], {}),
  )
  for (const name of ["U0", "U90", "U180", "U270", "UBOT", "U8"]) {
    expectSameCorner(
      reversed[name]!.indicatorCorner,
      baseline[name]!.indicatorCorner,
    )
  }

  const pinNumberOnlySoup: AnyCircuitElement[] = [
    ...nonPorts,
    ...reversedPorts,
  ].map((elm) =>
    elm.type === "source_port"
      ? {
          ...elm,
          port_hints: [],
          name: elm.pin_number === 1 ? "VIN" : elm.name,
        }
      : elm,
  )
  const pinNumberOnly = parseRenderedComponents(
    convertCircuitJsonToAssemblySvg(pinNumberOnlySoup, {}),
  )
  expectSameCorner(
    pinNumberOnly.U90!.indicatorCorner,
    baseline.U90!.indicatorCorner,
  )

  const a1HintSoup: AnyCircuitElement[] = [...nonPorts, ...reversedPorts].map(
    (elm) => {
      if (elm.type !== "source_port") return elm
      const isPin1 = elm.pin_number === 1
      return {
        ...elm,
        pin_number: undefined,
        name: isPin1 ? "SIG" : elm.name,
        port_hints: isPin1 ? ["A1"] : ["B2"],
      }
    },
  )
  const a1Hint = parseRenderedComponents(
    convertCircuitJsonToAssemblySvg(a1HintSoup, {}),
  )
  expectSameCorner(a1Hint.U180!.indicatorCorner, baseline.U180!.indicatorCorner)

  const pin1SrcIds = new Set(
    cju(baseSoup)
      .source_port.list()
      .filter((sp) => sp.pin_number === 1)
      .map((sp) => sp.source_port_id),
  )
  const pin1PcbIds = new Set(
    reversedPorts
      .filter((p) => pin1SrcIds.has(p.source_port_id))
      .map((p) => p.pcb_port_id),
  )
  const padHintSoup: AnyCircuitElement[] = [...nonPorts, ...reversedPorts].map(
    (elm) => {
      if (elm.type === "source_port")
        return { ...elm, pin_number: undefined, port_hints: [], name: "ANON" }
      if (elm.type === "pcb_smtpad")
        return {
          ...elm,
          port_hints:
            elm.pcb_port_id && pin1PcbIds.has(elm.pcb_port_id) ? ["pin1"] : [],
        }
      return elm
    },
  )
  const padHint = parseRenderedComponents(
    convertCircuitJsonToAssemblySvg(padHintSoup, {}),
  )
  expectSameCorner(padHint.U8!.indicatorCorner, baseline.U8!.indicatorCorner)
})
