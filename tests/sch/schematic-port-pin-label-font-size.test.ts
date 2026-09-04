import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SchematicComponent,
  SchematicPort,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createSvgObjectsForSchPortPinLabel } from "lib/sch/svg-object-fns/create-svg-objects-for-sch-port-pin-label"
import type { Matrix } from "transformation-matrix"

const transform: Matrix = { a: 100, b: 0, c: 0, d: -100, e: 0, f: 0 }

const schComponent: SchematicComponent = {
  type: "schematic_component",
  schematic_component_id: "schematic_component_1",
  center: { x: 0, y: 0 },
  size: { width: 2, height: 2 },
  is_box_with_pins: true,
}

const renderPinLabel = (overrides: Partial<SchematicPort> = {}) => {
  const schPort: SchematicPort = {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    source_port_id: "source_port_1",
    schematic_component_id: schComponent.schematic_component_id,
    center: { x: -1.2, y: 0 },
    side_of_component: "left",
    display_pin_label: "ENABLE",
    ...overrides,
  }

  const label = createSvgObjectsForSchPortPinLabel({
    schPort,
    schComponent,
    transform,
    circuitJson: [],
  })[0]

  if (!label) throw new Error("Expected a schematic pin label")
  return label
}

test("schematic port pin labels use an optional font-size override", () => {
  expect(renderPinLabel().attributes["font-size"]).toBe("15px")
  expect(
    renderPinLabel({ display_pin_label_font_size: 0.1 }).attributes[
      "font-size"
    ],
  ).toBe("10px")
})

test("font-size overrides apply to negated and inverted pin labels", () => {
  expect(
    renderPinLabel({ display_pin_label: "N_ENABLE" }).attributes["font-size"],
  ).toBe("12px")
  expect(
    renderPinLabel({
      display_pin_label: "N_ENABLE",
      display_pin_label_font_size: 0.09,
    }).attributes["font-size"],
  ).toBe("9px")
  expect(
    renderPinLabel({
      is_drawn_with_inversion_circle: true,
      display_pin_label_font_size: 0.08,
    }).attributes["font-size"],
  ).toBe("8px")
})

test("styled pin-label parts overline only their own substring", () => {
  const label = renderPinLabel({
    display_pin_label: "ABCD",
    display_pin_label_text_parts: [
      { text: "A" },
      { text: "BC", is_overlined: true },
      { text: "D" },
    ],
  } as Partial<SchematicPort>)

  expect(label.children.map((child) => child.name)).toEqual([
    "tspan",
    "tspan",
    "tspan",
  ])
  expect(label.children[0]?.attributes.style).toBeUndefined()
  expect(label.children[1]?.attributes.style).toBe("text-decoration: overline;")
  expect(label.children[2]?.attributes.style).toBeUndefined()
})

test("empty styled pin-label parts fall back to the display label", () => {
  const label = renderPinLabel({
    display_pin_label: "ABCD",
    display_pin_label_text_parts: [],
  } as Partial<SchematicPort>)

  expect(label.children).toHaveLength(1)
  expect(label.children[0]?.type).toBe("text")
  expect(label.children[0]?.value).toBe("ABCD")
})

test("font-size overrides do not change vertical label rotation", () => {
  const label = renderPinLabel({
    center: { x: 0, y: 1.2 },
    side_of_component: "top",
    display_pin_label_font_size: 0.1,
  })

  expect(label.attributes["font-size"]).toBe("10px")
  expect(label.attributes.transform).toStartWith("rotate(-90 ")
})

test("schematic pin-label font-size overrides", () => {
  const makeAffectedEasyEdaSymbol = ({
    id,
    x,
    fontSize,
    title,
  }: {
    id: string
    x: number
    fontSize?: number
    title: string
  }): AnyCircuitElement[] => {
    const schematicComponentId = `schematic_component_${id}`
    // C113367 (PAM8302AASCR) geometry, shown at its crowded imported scale.
    const scale = 0.65
    const offsetPoint = ({ x: pointX, y }: { x: number; y: number }) => ({
      x: x + pointX * scale,
      y: y * scale,
    })
    const ports = [
      {
        id: "sd",
        pinNumber: 1,
        x: -1.68,
        y: 1.05,
        side: "left",
        label: "N_SD",
      },
      {
        id: "in_neg",
        pinNumber: 4,
        x: -1.68,
        y: 0.21,
        side: "left",
        label: "IN_NEG",
      },
      {
        id: "in_pos",
        pinNumber: 3,
        x: -1.68,
        y: -0.63,
        side: "left",
        label: "IN_POS",
      },
      {
        id: "gnd",
        pinNumber: 7,
        x: 0,
        y: -1.89,
        side: "bottom",
        label: "GND",
      },
      {
        id: "vo_pos",
        pinNumber: 5,
        x: 1.68,
        y: -0.21,
        side: "right",
        label: "VO_POS",
      },
      {
        id: "vdd",
        pinNumber: 6,
        x: 0,
        y: 1.47,
        side: "top",
        label: "VDD",
      },
      {
        id: "vo_neg",
        pinNumber: 8,
        x: 1.68,
        y: -1.05,
        side: "right",
        label: "VO_NEG",
      },
      {
        id: "nc",
        pinNumber: 2,
        x: -1.68,
        y: -1.47,
        side: "left",
        label: "NC",
      },
    ] as const
    const symbolPaths = [
      [
        { x: -0.84, y: -1.05 },
        { x: 0.84, y: -0.21 },
        { x: -0.84, y: 0.63 },
        { x: -0.84, y: -1.05 },
      ],
      [
        { x: -0.672, y: 0.21 },
        { x: -0.42, y: 0.21 },
      ],
      [
        { x: -0.672, y: -0.63 },
        { x: -0.42, y: -0.63 },
      ],
      [
        { x: -0.546, y: -0.504 },
        { x: -0.546, y: -0.756 },
      ],
      [
        { x: 0, y: 0.63 },
        { x: 0, y: 0.21 },
      ],
      [
        { x: 0, y: -0.63 },
        { x: 0, y: -1.05 },
      ],
      [
        { x: 0.42, y: -0.42 },
        { x: 0.84, y: -1.05 },
      ],
      [
        { x: -0.588, y: 0.504 },
        { x: -0.84, y: 1.05 },
      ],
      [
        { x: -0.588, y: -0.924 },
        { x: -0.84, y: -1.47 },
      ],
    ]
    const crowdedPortIds = new Set([
      "in_neg",
      "in_pos",
      "vo_pos",
      "vo_neg",
      "vdd",
      "gnd",
    ])

    return [
      {
        type: "schematic_component",
        schematic_component_id: schematicComponentId,
        center: { x, y: 0 },
        size: { width: 2.184, height: 2.457 },
        is_box_with_pins: false,
      },
      ...ports.map(({ id: portId, pinNumber, x: portX, y, side, label }) => ({
        type: "schematic_port" as const,
        schematic_port_id: `schematic_port_${id}_${portId}`,
        source_port_id: `source_port_${id}_${portId}`,
        schematic_component_id: schematicComponentId,
        center: offsetPoint({ x: portX, y }),
        side_of_component: side,
        distance_from_component_edge: 0.84 * scale,
        pin_number: pinNumber,
        display_pin_label: label,
        display_pin_label_font_size: crowdedPortIds.has(portId)
          ? fontSize
          : undefined,
      })),
      ...ports.map(({ id: portId, x: portX, y, side }) => {
        const stemEnd =
          side === "left"
            ? { x: portX + 0.84, y }
            : side === "right"
              ? { x: portX - 0.84, y }
              : side === "top"
                ? { x: portX, y: y - 0.84 }
                : { x: portX, y: y + 0.84 }

        return {
          type: "schematic_line" as const,
          schematic_line_id: `schematic_line_${id}_${portId}`,
          schematic_component_id: schematicComponentId,
          x1: x + portX * scale,
          y1: y * scale,
          x2: x + stemEnd.x * scale,
          y2: stemEnd.y * scale,
          stroke_width: 0.02,
          color: "rgba(132, 0, 0)",
          is_dashed: false,
        }
      }),
      ...symbolPaths.map((points, pathIndex) => ({
        type: "schematic_path" as const,
        schematic_path_id: `schematic_path_${id}_${pathIndex}`,
        schematic_component_id: schematicComponentId,
        points: points.map(offsetPoint),
        is_filled: false,
        is_dashed: false,
        stroke_color: "#880000",
      })),
      ...[
        { text: "+", x: 1.512, y: -0.042 },
        { text: "-", x: 1.596, y: -0.966 },
      ].map(({ text, x: textX, y }, textIndex) => ({
        type: "schematic_text" as const,
        schematic_text_id: `schematic_text_${id}_polarity_${textIndex}`,
        text,
        font_size: 0.2,
        position: offsetPoint({ x: textX, y }),
        rotation: 0,
        anchor: "left" as const,
        color: "#0000FF",
      })),
      {
        type: "schematic_text",
        schematic_text_id: `schematic_text_${id}`,
        text: title,
        font_size: 0.18,
        position: { x, y: -1.55 },
        rotation: 0,
        anchor: "center",
        color: "#006464",
      },
    ]
  }

  const circuitJson: AnyCircuitElement[] = [
    ...makeAffectedEasyEdaSymbol({
      id: "default",
      x: -1.8,
      title: "C113367 · DEFAULT 0.15mm",
    }),
    ...makeAffectedEasyEdaSymbol({
      id: "override",
      x: 1.8,
      fontSize: 0.1,
      title: "C113367 · CROWDED PINS 0.10mm",
    }),
  ]

  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
