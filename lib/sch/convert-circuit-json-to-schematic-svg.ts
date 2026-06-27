import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap as defaultColorMap, type ColorMap } from "lib/utils/colors"
import { stringify } from "svgson"
import {
  applyToPoint,
  compose,
  scale,
  translate,
  fromTriangles,
  type Matrix,
  fromTwoMovingPoints,
  toSVG,
} from "transformation-matrix"
import { drawSchematicGrid } from "./draw-schematic-grid"
import { drawSchematicLabeledPoints } from "./draw-schematic-labeled-points"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"
import { createSvgObjectsFromSchematicComponent } from "./svg-object-fns/create-svg-objects-from-sch-component"
import { createSvgObjectsFromSchVoltageProbe } from "./svg-object-fns/create-svg-objects-from-sch-voltage-probe"
import { createSvgObjectsFromSchDebugObject } from "./svg-object-fns/create-svg-objects-from-sch-debug-object"
import { createSchematicTrace } from "./svg-object-fns/create-svg-objects-from-sch-trace"
import { createSvgObjectsForSchNetLabel } from "./svg-object-fns/create-svg-objects-for-sch-net-label"
import { createSvgSchText } from "./svg-object-fns/create-svg-objects-for-sch-text"
import { createSvgObjectsFromSchematicBox } from "./svg-object-fns/create-svg-objects-from-sch-box"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import { createSvgObjectsFromSchematicTable } from "./svg-object-fns/create-svg-objects-from-sch-table"
import { createSvgObjectsForSchComponentPortHovers } from "./svg-object-fns/create-svg-objects-for-sch-port-hover"
import { createSvgObjectsFromSchematicLine } from "./svg-object-fns/create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicCircle } from "./svg-object-fns/create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicRect } from "./svg-object-fns/create-svg-objects-from-sch-rect"
import { createSvgObjectsFromSchematicArc } from "./svg-object-fns/create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicPath } from "./svg-object-fns/create-svg-objects-from-sch-path"
import { createErrorTextOverlay } from "lib/utils/create-error-text-overlay"
import { createSvgObjectsForSchPortIndicator } from "./svg-object-fns/create-svg-objects-for-sch-port-indicator"
import { createSvgObjectsFromSchematicSheet } from "./svg-object-fns/create-svg-objects-from-sch-sheet"
import { getSchematicSheetLayout } from "./schematic-sheet-utils"

export type ColorOverrides = {
  schematic?: Partial<ColorMap["schematic"]>
}

interface Options {
  colorOverrides?: ColorOverrides
  width?: number
  height?: number
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

function createCenteredSheetSubcircuitTransform({
  sheet,
  sheetIndex,
  transform,
  elements,
}: {
  sheet: SchematicSheet
  sheetIndex: number
  transform: Matrix
  elements: AnyCircuitElement[]
}): Matrix {
  const bounds = getSchematicBoundsFromCircuitJson(elements, 0.2)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  if (width <= 0 || height <= 0) return transform

  const layout = getSchematicSheetLayout(sheet, sheetIndex)
  const contentWidth = layout.innerMaxX - layout.innerMinX
  const contentHeight = layout.innerMaxY - layout.innerMinY
  const fitScale = Math.min(contentWidth / width, contentHeight / height) * 0.8
  const childCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }

  return compose(
    transform,
    translate(layout.center.x, layout.center.y),
    scale(fitScale, fitScale),
    translate(-childCenter.x, -childCenter.y),
  )
}

function getSchematicElementsForSubcircuit(
  circuitJson: AnyCircuitElement[],
  subcircuitId: string,
): AnyCircuitElement[] {
  const sourceGroupIds = new Set(
    circuitJson
      .filter(
        (elm): elm is Extract<AnyCircuitElement, { type: "source_group" }> =>
          elm.type === "source_group" && elm.subcircuit_id === subcircuitId,
      )
      .map((elm) => elm.source_group_id),
  )
  const sourceComponentIds = new Set(
    circuitJson
      .filter(
        (
          elm,
        ): elm is Extract<AnyCircuitElement, { type: "source_component" }> => {
          if (elm.type !== "source_component") return false
          const sourceComponent = elm as {
            subcircuit_id?: string
            source_group_id?: string
          }
          return (
            sourceComponent.subcircuit_id === subcircuitId ||
            (sourceComponent.source_group_id !== undefined &&
              sourceGroupIds.has(sourceComponent.source_group_id))
          )
        },
      )
      .map((elm) => elm.source_component_id),
  )
  const schematicComponentIds = new Set(
    circuitJson
      .filter(
        (
          elm,
        ): elm is Extract<AnyCircuitElement, { type: "schematic_component" }> =>
          elm.type === "schematic_component" &&
          (elm.subcircuit_id === subcircuitId ||
            sourceComponentIds.has(elm.source_component_id ?? "") ||
            (elm.source_group_id !== undefined &&
              sourceGroupIds.has(elm.source_group_id))),
      )
      .map((elm) => elm.schematic_component_id),
  )
  for (const elm of circuitJson) {
    if (elm.type !== "schematic_component") continue
    if (schematicComponentIds.has(elm.schematic_component_id)) {
      sourceComponentIds.add(elm.source_component_id ?? "")
    }
  }

  const sourcePortIds = new Set(
    circuitJson
      .filter(
        (elm): elm is Extract<AnyCircuitElement, { type: "source_port" }> =>
          elm.type === "source_port" &&
          elm.source_component_id !== undefined &&
          sourceComponentIds.has(elm.source_component_id),
      )
      .map((elm) => elm.source_port_id),
  )

  return circuitJson.filter((elm) => {
    if (elm.type === "schematic_sheet") return false
    if ((elm as { subcircuit_id?: string }).subcircuit_id === subcircuitId) {
      return true
    }
    const schematicComponentId = (elm as { schematic_component_id?: string })
      .schematic_component_id
    if (
      schematicComponentId &&
      schematicComponentIds.has(schematicComponentId)
    ) {
      return true
    }
    const sourceComponentId = (elm as { source_component_id?: string })
      .source_component_id
    if (sourceComponentId && sourceComponentIds.has(sourceComponentId)) {
      return true
    }
    const sourceGroupId = (elm as { source_group_id?: string }).source_group_id
    if (sourceGroupId && sourceGroupIds.has(sourceGroupId)) {
      return true
    }
    if (elm.type === "source_trace") {
      return elm.connected_source_port_ids.some((sourcePortId) =>
        sourcePortIds.has(sourcePortId),
      )
    }
    if (elm.type === "schematic_port") {
      return sourcePortIds.has(elm.source_port_id)
    }
    return false
  })
}

export function convertCircuitJsonToSchematicSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  // Get bounds with padding
  const realBounds = getSchematicBoundsFromCircuitJson(circuitJson)
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
  const collectSchematicSvgObjects = ({
    elements,
    elementTransform,
    renderCircuitJson,
  }: {
    elements: AnyCircuitElement[]
    elementTransform: Matrix
    renderCircuitJson: AnyCircuitElement[]
  }) => {
    for (const elm of elements) {
      if (elm.type === "schematic_debug_object") {
        schDebugObjectSvgs.push(
          ...createSvgObjectsFromSchDebugObject({
            debugObject: elm,
            transform: elementTransform,
          }),
        )
      } else if (elm.type === "schematic_component") {
        schComponentSvgs.push(
          ...createSvgObjectsFromSchematicComponent({
            component: elm,
            transform: elementTransform,
            circuitJson: renderCircuitJson,
            colorMap,
          }),
        )
        schPortHoverSvgs.push(
          ...createSvgObjectsForSchComponentPortHovers({
            component: elm,
            transform: elementTransform,
            circuitJson: renderCircuitJson,
          }),
        )
      } else if (elm.type === "schematic_box") {
        schBoxSvgs.push(
          ...createSvgObjectsFromSchematicBox({
            schematicBox: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_trace") {
        schTraceSvgs.push(
          ...createSchematicTrace({
            trace: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
        if (elm.subcircuit_connectivity_map_key) {
          connectivityKeys.add(elm.subcircuit_connectivity_map_key)
        }
      } else if (elm.type === "schematic_net_label") {
        schNetLabel.push(
          ...createSvgObjectsForSchNetLabel({
            schNetLabel: elm,
            realToScreenTransform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_text" && !elm.schematic_component_id) {
        schText.push(
          createSvgSchText({
            elm,
            transform: elementTransform,
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
            transform: elementTransform,
            colorMap,
            fallbackColor,
          }),
        )
      } else if (elm.type === "schematic_table") {
        schTableSvgs.push(
          ...createSvgObjectsFromSchematicTable({
            schematicTable: elm,
            transform: elementTransform,
            colorMap,
            circuitJson: renderCircuitJson,
          }),
        )
      } else if (elm.type === "schematic_line") {
        if (elm.schematic_component_id) continue
        schLineSvgs.push(
          ...createSvgObjectsFromSchematicLine({
            schLine: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_circle") {
        if (elm.schematic_component_id) continue
        schCircleSvgs.push(
          ...createSvgObjectsFromSchematicCircle({
            schCircle: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_rect") {
        if (elm.schematic_component_id) continue
        schRectSvgs.push(
          ...createSvgObjectsFromSchematicRect({
            schRect: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_arc") {
        if (elm.schematic_component_id) continue
        schArcSvgs.push(
          ...createSvgObjectsFromSchematicArc({
            schArc: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_path") {
        if (elm.schematic_component_id) continue
        schPathSvgs.push(
          ...createSvgObjectsFromSchematicPath({
            schPath: elm,
            transform: elementTransform,
            colorMap,
          }),
        )
      } else if (elm.type === "schematic_port" && options?.drawPorts) {
        schPortIndicatorSvgs.push(
          ...createSvgObjectsForSchPortIndicator({
            schPort: elm,
            transform: elementTransform,
            circuitJson: renderCircuitJson,
            colorMap,
          }),
        )
      }
    }
  }

  const schematicSheets = circuitJson.filter(
    (elm): elm is SchematicSheet => elm.type === "schematic_sheet",
  )

  if (schematicSheets.length > 0) {
    const sheetedSubcircuitIds = new Set(
      schematicSheets
        .map((sheet) => sheet.subcircuit_id)
        .filter((id): id is string => Boolean(id)),
    )
    const sheetedSchematicComponentIds = new Set(
      circuitJson
        .filter(
          (
            elm,
          ): elm is Extract<
            AnyCircuitElement,
            { type: "schematic_component" }
          > =>
            elm.type === "schematic_component" &&
            elm.subcircuit_id !== undefined &&
            sheetedSubcircuitIds.has(elm.subcircuit_id),
        )
        .map((elm) => elm.schematic_component_id),
    )
    const sheetedElements = new Set<AnyCircuitElement>()

    schematicSheets.forEach((sheet, sheetIndex) => {
      schSheetSvgs.push(
        ...createSvgObjectsFromSchematicSheet({
          schematicSheet: sheet,
          sheetIndex,
          transform,
          colorMap,
        }),
      )

      if (!sheet.subcircuit_id) return

      const linkedElements = getSchematicElementsForSubcircuit(
        circuitJson,
        sheet.subcircuit_id,
      )
      if (linkedElements.length === 0) return
      for (const linkedElement of linkedElements) {
        sheetedElements.add(linkedElement)
      }

      collectSchematicSvgObjects({
        elements: linkedElements,
        elementTransform: createCenteredSheetSubcircuitTransform({
          sheet,
          sheetIndex,
          transform,
          elements: linkedElements,
        }),
        renderCircuitJson: linkedElements,
      })
    })

    collectSchematicSvgObjects({
      elements: circuitJson.filter(
        (elm) =>
          elm.type !== "schematic_sheet" &&
          !sheetedElements.has(elm) &&
          !sheetedSubcircuitIds.has(
            (elm as { subcircuit_id?: string }).subcircuit_id ?? "",
          ) &&
          !sheetedSchematicComponentIds.has(
            (elm as { schematic_component_id?: string })
              .schematic_component_id ?? "",
          ),
      ),
      elementTransform: transform,
      renderCircuitJson: circuitJson,
    })
  } else {
    collectSchematicSvgObjects({
      elements: circuitJson,
      elementTransform: transform,
      renderCircuitJson: circuitJson,
    })
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
    ...schSheetSvgs,
    ...schDebugObjectSvgs,
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
