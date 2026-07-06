import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import type { SvgObject } from "lib/svg-object"
import { type ColorMap, colorMap as defaultColorMap } from "lib/utils/colors"
import { createErrorTextOverlay } from "lib/utils/create-error-text-overlay"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { stringify } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  fromTriangles,
  fromTwoMovingPoints,
  scale,
  toSVG,
  translate,
} from "transformation-matrix"
import { drawSchematicGrid } from "./draw-schematic-grid"
import { drawSchematicLabeledPoints } from "./draw-schematic-labeled-points"
import { getDefaultSchematicSheet } from "./get-default-schematic-sheet"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"
import { createSvgObjectsForSchNetLabel } from "./svg-object-fns/create-svg-objects-for-sch-net-label"
import { createSvgObjectsForSchComponentPortHovers } from "./svg-object-fns/create-svg-objects-for-sch-port-hover"
import { createSvgObjectsForSchPortIndicator } from "./svg-object-fns/create-svg-objects-for-sch-port-indicator"
import { createSvgSchText } from "./svg-object-fns/create-svg-objects-for-sch-text"
import { createSvgObjectsFromSchematicArc } from "./svg-object-fns/create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicBox } from "./svg-object-fns/create-svg-objects-from-sch-box"
import { createSvgObjectsFromSchematicCircle } from "./svg-object-fns/create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicComponent } from "./svg-object-fns/create-svg-objects-from-sch-component"
import { createSvgObjectsFromSchDebugObject } from "./svg-object-fns/create-svg-objects-from-sch-debug-object"
import { createSvgObjectsFromSchematicLine } from "./svg-object-fns/create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicPath } from "./svg-object-fns/create-svg-objects-from-sch-path"
import { createSvgObjectsFromSchematicRect } from "./svg-object-fns/create-svg-objects-from-sch-rect"
import { createSvgObjectsFromSchematicSheet } from "./svg-object-fns/create-svg-objects-from-sch-sheet"
import { createSvgObjectsFromSchematicTable } from "./svg-object-fns/create-svg-objects-from-sch-table"
import { createSchematicTrace } from "./svg-object-fns/create-svg-objects-from-sch-trace"
import { createSvgObjectsFromSchVoltageProbe } from "./svg-object-fns/create-svg-objects-from-sch-voltage-probe"

export type ColorOverrides = {
  schematic?: Partial<ColorMap["schematic"]>
}

interface Options {
  colorOverrides?: ColorOverrides
  width?: number
  height?: number
  schematicSheetIndex?: number
  schematicSheetId?: string
  grid?: boolean | { cellSize?: number; labelCells?: boolean }
  labeledPoints?: Array<{ x: number; y: number; label: string }>
  includeVersion?: boolean
  showErrorsInTextOverlay?: boolean
  drawPorts?: boolean
  css?: string
  className?: string
}

// Build CSS rules to highlight all traces sharing a connectivity key
// when any corresponding trace (base or overlays) is hovered.
function buildNetHoverStyles(connectivityKeys: Set<string>): string {
  const rules: string[] = []
  const esc = (v: string) => String(v).replace(/"/g, '\\"')
  for (const key of connectivityKeys) {
    const k = esc(key)
    const keyAttr = `[data-subcircuit-connectivity-map-key="${k}"]`
    const baseSel = `g.trace${keyAttr}`
    const overlaySel = `g.trace-overlays${keyAttr}`
    const hovered = `:is(${baseSel}, ${overlaySel}):hover`
    const target = `:is(${baseSel}, ${overlaySel})`
    // Invert color for all segments in the net when any is hovered
    rules.push(`svg:has(${hovered}) ${target} { filter: invert(1); }`)
    // Hide crossing outline for the hovered net
    rules.push(
      `svg:has(${hovered}) ${overlaySel} .trace-crossing-outline { opacity: 0; }`,
    )
  }
  return rules.join("\n")
}

export function convertCircuitJsonToSchematicSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  const schematicSheets = circuitJson.filter(
    (elm): elm is SchematicSheet => elm.type === "schematic_sheet",
  )
  const defaultSheet = getDefaultSchematicSheet(schematicSheets)
  let selectedSheet = defaultSheet

  if (options?.schematicSheetId !== undefined) {
    selectedSheet =
      schematicSheets.find(
        (sheet) => sheet.schematic_sheet_id === options.schematicSheetId,
      ) ?? defaultSheet
  } else if (options?.schematicSheetIndex !== undefined) {
    selectedSheet =
      schematicSheets.find(
        (sheet) => sheet.sheet_index === options.schematicSheetIndex,
      ) ?? defaultSheet
  }

  const sheetCircuitJson = selectedSheet
    ? circuitJson.filter(
        (elm) =>
          !elm.type.startsWith("schematic_") ||
          ("schematic_sheet_id" in elm &&
            elm.schematic_sheet_id === selectedSheet.schematic_sheet_id),
      )
    : circuitJson

  // Get bounds with padding
  const realBounds = getSchematicBoundsFromCircuitJson(sheetCircuitJson)
  const realWidth = realBounds.maxX - realBounds.minX
  const realHeight = realBounds.maxY - realBounds.minY

  const svgWidth = options?.width ?? 1200
  const svgHeight = options?.height ?? 600
  const colorOverrides = options?.colorOverrides

  const colorMap: ColorMap = {
    ...defaultColorMap,
    schematic: {
      ...defaultColorMap.schematic,
      ...(colorOverrides?.schematic ?? {}),
    },
  }

  // Compute the padding such that we maintain the same aspect ratio
  const circuitAspectRatio = realWidth / realHeight
  const containerAspectRatio = svgWidth / svgHeight

  let screenPaddingPx: { x: number; y: number }
  if (circuitAspectRatio > containerAspectRatio) {
    // Circuit is wider than container - fit to width
    const newHeight = svgWidth / circuitAspectRatio
    screenPaddingPx = {
      x: 0,
      y: (svgHeight - newHeight) / 2,
    }
  } else {
    // Circuit is taller than container - fit to height
    const newWidth = svgHeight * circuitAspectRatio
    screenPaddingPx = {
      x: (svgWidth - newWidth) / 2,
      y: 0,
    }
  }

  // Calculate projection using REAL points and SCREEN points
  // We're saying to map the real bounds to the screen bounds by giving 3 points
  // for each coordinate space
  const transform = fromTriangles(
    [
      { x: realBounds.minX, y: realBounds.maxY },
      { x: realBounds.maxX, y: realBounds.maxY },
      { x: realBounds.maxX, y: realBounds.minY },
    ],
    [
      { x: screenPaddingPx.x, y: screenPaddingPx.y },
      { x: svgWidth - screenPaddingPx.x, y: screenPaddingPx.y },
      { x: svgWidth - screenPaddingPx.x, y: svgHeight - screenPaddingPx.y },
    ],
  )
  const svgChildren: SvgObject[] = []

  // Add background rectangle
  svgChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "boundary",
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
    },
    children: [],
    value: "",
  })

  // Add grid if enabled
  if (options?.grid) {
    const gridConfig = typeof options.grid === "object" ? options.grid : {}
    svgChildren.push(
      drawSchematicGrid({ bounds: realBounds, transform, ...gridConfig }),
    )
  }

  const schDebugObjectSvgs: SvgObject[] = []
  const schComponentSvgs: SvgObject[] = []
  const schTraceSvgs: SvgObject[] = []
  const connectivityKeys = new Set<string>()
  // schematic_trace elements often don't carry a connectivity key themselves;
  // fall back to the key on their source_trace so net hover works for them.
  const sourceTraceConnectivityKeyById = new Map<string, string>()
  for (const elm of circuitJson) {
    if (elm.type === "source_trace" && elm.subcircuit_connectivity_map_key) {
      sourceTraceConnectivityKeyById.set(
        elm.source_trace_id,
        elm.subcircuit_connectivity_map_key,
      )
    }
  }
  const schNetLabel: SvgObject[] = []
  const schText: SvgObject[] = []
  const voltageProbeSvgs: SvgObject[] = []
  const schBoxSvgs: SvgObject[] = []
  const schTableSvgs: SvgObject[] = []
  const schPortHoverSvgs: SvgObject[] = []
  const schPortIndicatorSvgs: SvgObject[] = []
  const schLineSvgs: SvgObject[] = []
  const schCircleSvgs: SvgObject[] = []
  const schRectSvgs: SvgObject[] = []
  const schArcSvgs: SvgObject[] = []
  const schPathSvgs: SvgObject[] = []
  const schSheetSvgs: SvgObject[] = []
  const simulationPalette = Array.isArray(colorMap.simulation_palette)
    ? colorMap.simulation_palette
    : Array.isArray(colorMap.palette)
      ? colorMap.palette
      : []
  let schematicVoltageProbeIndex = 0
  for (const elm of sheetCircuitJson) {
    if (elm.type === "schematic_sheet") {
      schSheetSvgs.push(
        ...createSvgObjectsFromSchematicSheet({
          schematicSheet: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_debug_object") {
      schDebugObjectSvgs.push(
        ...createSvgObjectsFromSchDebugObject({
          debugObject: elm,
          transform,
        }),
      )
    } else if (elm.type === "schematic_component") {
      schComponentSvgs.push(
        ...createSvgObjectsFromSchematicComponent({
          component: elm,
          transform,
          circuitJson: sheetCircuitJson,
          colorMap,
        }),
      )
      schPortHoverSvgs.push(
        ...createSvgObjectsForSchComponentPortHovers({
          component: elm,
          transform,
          circuitJson: sheetCircuitJson,
        }),
      )
    } else if (elm.type === "schematic_box") {
      schBoxSvgs.push(
        ...createSvgObjectsFromSchematicBox({
          schematicBox: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_trace") {
      const connectivityKey =
        elm.subcircuit_connectivity_map_key ??
        (elm.source_trace_id
          ? sourceTraceConnectivityKeyById.get(elm.source_trace_id)
          : undefined)
      schTraceSvgs.push(
        ...createSchematicTrace({
          trace: elm,
          transform,
          colorMap,
          connectivityKey,
        }),
      )
      if (connectivityKey) {
        connectivityKeys.add(connectivityKey)
      }
    } else if (elm.type === "schematic_net_label") {
      schNetLabel.push(
        ...createSvgObjectsForSchNetLabel({
          schNetLabel: elm,
          realToScreenTransform: transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_text" && !elm.schematic_component_id) {
      schText.push(
        createSvgSchText({
          elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_voltage_probe") {
      const fallbackColor =
        simulationPalette.length > 0
          ? simulationPalette[
              schematicVoltageProbeIndex % simulationPalette.length
            ]
          : undefined
      schematicVoltageProbeIndex += 1
      voltageProbeSvgs.push(
        ...createSvgObjectsFromSchVoltageProbe({
          probe: elm,
          transform,
          colorMap,
          fallbackColor,
        }),
      )
    } else if (elm.type === "schematic_table") {
      schTableSvgs.push(
        ...createSvgObjectsFromSchematicTable({
          schematicTable: elm,
          transform,
          colorMap,
          circuitJson: sheetCircuitJson,
        }),
      )
    } else if (elm.type === "schematic_line") {
      if (elm.schematic_component_id) continue
      schLineSvgs.push(
        ...createSvgObjectsFromSchematicLine({
          schLine: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_circle") {
      if (elm.schematic_component_id) continue
      schCircleSvgs.push(
        ...createSvgObjectsFromSchematicCircle({
          schCircle: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_rect") {
      if (elm.schematic_component_id) continue
      schRectSvgs.push(
        ...createSvgObjectsFromSchematicRect({
          schRect: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_arc") {
      if (elm.schematic_component_id) continue
      schArcSvgs.push(
        ...createSvgObjectsFromSchematicArc({
          schArc: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_path") {
      if (elm.schematic_component_id) continue
      schPathSvgs.push(
        ...createSvgObjectsFromSchematicPath({
          schPath: elm,
          transform,
          colorMap,
        }),
      )
    } else if (elm.type === "schematic_port" && options?.drawPorts) {
      schPortIndicatorSvgs.push(
        ...createSvgObjectsForSchPortIndicator({
          schPort: elm,
          transform,
          circuitJson: sheetCircuitJson,
          colorMap,
        }),
      )
    }
  }

  // Split traces into base vs overlays, ensure overlays render on top of all base wires
  const schTraceBaseSvgs = schTraceSvgs.filter(
    (o) => (o.attributes as any)?.["data-layer"] !== "overlay",
  )
  const schTraceOverlaySvgs = schTraceSvgs.filter(
    (o) => (o.attributes as any)?.["data-layer"] === "overlay",
  )

  // Add elements in correct order
  svgChildren.push(
    ...schDebugObjectSvgs,
    ...schSheetSvgs,
    ...schTraceBaseSvgs,
    ...schTraceOverlaySvgs,
    ...schLineSvgs,
    ...schCircleSvgs,
    ...schRectSvgs,
    ...schArcSvgs,
    ...schPathSvgs,
    ...schComponentSvgs,
    ...schPortHoverSvgs,
    ...schPortIndicatorSvgs,
    ...schNetLabel,
    ...schText,
    ...schBoxSvgs,
    ...voltageProbeSvgs,
    ...schTableSvgs,
  )

  // Add labeled points if provided
  if (options?.labeledPoints) {
    svgChildren.push(
      drawSchematicLabeledPoints({
        points: options.labeledPoints,
        transform,
      }),
    )
  }

  const softwareUsedString = getSoftwareUsedString(circuitJson)
  const version = CIRCUIT_TO_SVG_VERSION

  if (options?.showErrorsInTextOverlay) {
    const errorOverlay = createErrorTextOverlay(circuitJson)
    if (errorOverlay) {
      svgChildren.push(errorOverlay)
    }
  }

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      class: ["tscircuit-schematic", options?.className]
        .filter(Boolean)
        .join(" "),
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      style: `background-color: ${colorMap.schematic.background}`,
      "data-real-to-screen-transform": toSVG(transform),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(options?.includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    children: [
      // Add styles
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",

            // DO NOT USE THESE CLASSES!!!!
            // PUT STYLES IN THE SVG OBJECTS THEMSELVES
            value: `
              .boundary { fill: ${colorMap.schematic.background}; }
              .schematic-boundary { fill: none; stroke: #fff; }
              .component { fill: none; stroke: ${colorMap.schematic.component_outline}; }
              .chip { fill: ${colorMap.schematic.component_body}; stroke: ${colorMap.schematic.component_outline}; }
              .component-pin { fill: none; stroke: ${colorMap.schematic.component_outline}; }
              /* Basic per-trace hover fallback */
              .trace:hover {
                filter: invert(1);
              }
              .trace:hover .trace-crossing-outline {
                opacity: 0;
              }
              .trace:hover .trace-junction {
                filter: invert(1);
              }
              /* Net-hover highlighting: when a trace or its overlays are hovered,
                 invert color for all traces (base + overlays) sharing the same
                 subcircuit connectivity key. Also hide crossing outline during hover. */
              ${buildNetHoverStyles(connectivityKeys)}
              .text { font-family: sans-serif; fill: ${colorMap.schematic.wire}; }
              .pin-number { fill: ${colorMap.schematic.pin_number}; }
              .port-label { fill: ${colorMap.schematic.reference}; }
              .component-name { fill: ${colorMap.schematic.reference}; }
              ${options?.css ?? ""}
            `,
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
        attributes: {},
      },
      ...svgChildren,
    ],
    value: "",
  }

  return stringify(svgObject)
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
