import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic crossing traces", () => {
  expect(
    convertCircuitJsonToSchematicSvg([
      {
        type: "schematic_trace",
        schematic_trace_id: "schematic_trace_2",
        source_trace_id: "source_trace_2",
        edges: [
          {
            from: {
              route_type: "wire",
              x: -3.4662092999999996,
              y: 0.004741299999999338,
              width: 0.1,
              layer: "top",
            },
            to: {
              x: -2.25,
              y: 0.004741299999999338,
            },
          },
          {
            from: {
              x: -2.25,
              y: 0.004741299999999338,
            },
            to: {
              x: -2.1500000000000004,
              y: 0.004741299999999338,
            },
            is_crossing: true,
          },
          {
            from: {
              route_type: "wire",
              x: -3.4662092999999996,
              y: 0.004741299999999338,
              width: 0.1,
              layer: "top",
            },
            to: {
              x: -2.4662092999999996,
              y: 0.004741299999999338,
            },
          },
          {
            from: {
              x: -2.4662092999999996,
              y: 0.004741299999999338,
            },
            to: {
              x: -2.3662093,
              y: 0.004741299999999338,
            },
            is_crossing: true,
          },
          {
            from: {
              x: -2.3662093,
              y: 0.004741299999999338,
            },
            to: {
              route_type: "wire",
              x: -2.0999999999999996,
              y: 0.004741299999999338,
              width: 0.1,
              layer: "top",
            },
          },
          {
            from: {
              route_type: "wire",
              x: -2.0999999999999996,
              y: 0.004741299999999338,
              width: 0.1,
              layer: "top",
            },
            to: {
              route_type: "wire",
              x: -2.0999999999999996,
              y: -0.30000000000000004,
              width: 0.1,
              layer: "top",
            },
          },
          {
            from: {
              route_type: "wire",
              x: -2.0999999999999996,
              y: -0.30000000000000004,
              width: 0.1,
              layer: "top",
            },
            to: {
              route_type: "wire",
              x: -1.2999999999999998,
              y: -0.30000000000000004,
              width: 0.1,
              layer: "top",
            },
          },
          {
            from: {
              route_type: "wire",
              x: -1.2999999999999998,
              y: -0.30000000000000004,
              width: 0.1,
              layer: "top",
            },
            to: {
              x: -1.15,
              y: -0.30000000000000004,
            },
          },
        ],
        junctions: [],
      },
    ]),
  ).toMatchSvgSnapshot(import.meta.path)
})
