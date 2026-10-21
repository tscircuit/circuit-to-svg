import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { createSvgObjectsFromSchematicComponentWithSymbol } from "lib/sch/svg-object-fns/create-svg-objects-from-sch-component-with-symbol"
import { colorMap } from "lib/utils/colors"
import { matchSchPortsToSymbolPorts } from "lib/utils/match-sch-ports-with-symbol-ports"
import { pointPairsToMatrix } from "lib/utils/point-pairs-to-matrix"
import { type SchSymbol, symbols } from "schematic-symbols"
import {
  applyToPoint,
  compose,
  identity,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"

test("native symbols stay attached to both pins when their positions imply rotation", async () => {
  const symbol = (symbols as Record<string, SchSymbol | undefined>).diode_right!
  const circuitJson: AnyCircuitElement[] = []

  for (const [index, rotation] of [0, 30, -30, 0, 30, -30].entries()) {
    const center = { x: (index % 3) * 4, y: -Math.floor(index / 3) * 4 }
    const symbolScale = index < 3 ? 1 : 1.5
    const component: SchematicComponent = {
      type: "schematic_component",
      schematic_component_id: `sc${index}`,
      source_component_id: `c${index}`,
      symbol_name: "diode_right",
      center,
      size: { width: 2, height: 2 },
      is_box_with_pins: true,
    }
    // Symbol-local points and circuit-world points both use mm, +X right, +Y up.
    // Rotate counterclockwise about the symbol center before placing it.
    const placement = compose(
      translate(center.x, center.y),
      rotateDEG(rotation),
      scale(symbolScale),
      translate(-symbol.center.x, -symbol.center.y),
    )
    const ports: SchematicPort[] = symbol.ports.map((port, portIndex) => ({
      type: "schematic_port",
      schematic_port_id: `sp${index}_${portIndex}`,
      schematic_component_id: component.schematic_component_id,
      source_port_id: `p${index}_${portIndex}`,
      center: applyToPoint(placement, port),
      pin_number: Number(port.labels[0]),
    }))
    circuitJson.push(
      {
        type: "source_component",
        source_component_id: `c${index}`,
        ftype: "simple_chip",
        name: `D${index + 1}`,
      },
      component,
      ...ports,
      {
        type: "schematic_text",
        schematic_text_id: `caption${index}`,
        text: `${rotation} deg / ${symbolScale}x`,
        position: { x: center.x, y: center.y - 1.4 },
        anchor: "center",
        rotation: 0,
        font_size: 0.2,
        color: "teal",
      },
    )

    const matches = matchSchPortsToSymbolPorts({
      schPorts: ports,
      symbol,
      schComponent: component,
    })
    expect(matches).toHaveLength(symbol.ports.length)
    for (const { schPort, symbolPort } of matches) {
      expect(schPort.pin_number).toBe(Number(symbolPort.labels[0]))
    }

    // The renderer reconstructs the placement from two matched ports. Check all
    // pins, so a transform that only places its anchor correctly cannot pass.
    const first = matches[0]!
    const second = matches[1]!
    const renderedPlacement = pointPairsToMatrix(
      first.symbolPort,
      first.schPort.center,
      second.symbolPort,
      second.schPort.center,
    )
    for (const { schPort, symbolPort } of matches) {
      const renderedPort = applyToPoint(renderedPlacement, symbolPort)
      expect(renderedPort.x).toBeCloseTo(schPort.center.x, 8)
      expect(renderedPort.y).toBeCloseTo(schPort.center.y, 8)
      circuitJson.push({
        type: "schematic_line",
        schematic_line_id: `lead${schPort.schematic_port_id}`,
        x1: schPort.center.x,
        y1: schPort.center.y,
        x2: center.x + 1.6 * (schPort.center.x - center.x),
        y2: center.y + 1.6 * (schPort.center.y - center.y),
        stroke_width: 0.02,
        color: "teal",
        is_dashed: false,
      })
    }

    const rendered = createSvgObjectsFromSchematicComponentWithSymbol({
      component,
      transform: identity(),
      circuitJson,
      colorMap,
    })
    const overlay = rendered.find((element) => element.name === "rect")!
    const left = Number(overlay.attributes.x)
    const top = Number(overlay.attributes.y)
    const right = left + Number(overlay.attributes.width)
    const bottom = top + Number(overlay.attributes.height)
    // The invisible selection overlay must enclose the visible symbol, too.
    for (const primitive of symbol.primitives) {
      if (primitive.type !== "path") continue
      for (const point of primitive.points) {
        const expected = applyToPoint(placement, point)
        expect(expected.x).toBeGreaterThanOrEqual(left - 1e-8)
        expect(expected.x).toBeLessThanOrEqual(right + 1e-8)
        expect(expected.y).toBeGreaterThanOrEqual(top - 1e-8)
        expect(expected.y).toBeLessThanOrEqual(bottom + 1e-8)
      }
    }
  }

  await expect(
    convertCircuitJsonToSchematicSvg(circuitJson),
  ).toMatchSvgSnapshot(import.meta.path)
})
