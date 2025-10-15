import type { AnyCircuitElement } from "circuit-json"
import { stringify, parseSync } from "svgson"
import { convertCircuitJsonToSchematicSvg } from "./sch/convert-circuit-json-to-schematic-svg"
import { convertCircuitJsonToSimulationGraphSvg } from "./sim/convert-circuit-json-to-simulation-graph-svg"
import {
  type CircuitJsonWithSimulation,
  isSimulationExperiment,
  isSimulationTransientVoltageGraph,
} from "./sim/types"
import { CIRCUIT_TO_SVG_VERSION } from "./package-version"
import { getSoftwareUsedString } from "./utils/get-software-used-string"
import type { SvgObject } from "./svg-object"

interface ConvertSchematicSimulationParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_transient_voltage_graph_ids?: string[]
  width?: number
  height?: number
  schematicHeightRatio?: number
  schematicOptions?: Omit<
    Parameters<typeof convertCircuitJsonToSchematicSvg>[1],
    "width" | "height" | "includeVersion"
  >
  includeVersion?: boolean
}

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 1200
const DEFAULT_SCHEMATIC_RATIO = 0.55

export function convertCircuitJsonToSchematicSimulationSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_voltage_graph_ids,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  schematicHeightRatio = DEFAULT_SCHEMATIC_RATIO,
  schematicOptions,
  includeVersion,
}: ConvertSchematicSimulationParams): string {
  const schematicElements = circuitJson.filter(
    (element): element is AnyCircuitElement =>
      !isSimulationExperiment(element) &&
      !isSimulationTransientVoltageGraph(element),
  )

  const clampedRatio = clamp01(schematicHeightRatio)
  const rawSchematicHeight = Math.max(1, height * clampedRatio)
  const rawSimulationHeight = Math.max(1, height - rawSchematicHeight)
  const totalRawHeight = rawSchematicHeight + rawSimulationHeight
  const scale = totalRawHeight === 0 ? 1 : height / totalRawHeight
  const schematicHeight = rawSchematicHeight * scale
  const simulationHeight = rawSimulationHeight * scale

  const simulationSvg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id,
    simulation_transient_voltage_graph_ids,
    width,
    height: simulationHeight,
    includeVersion: false,
  })

  const simulationNode = ensureElementNode(parseSync(simulationSvg))
  const finalWidth = Number(simulationNode.attributes.width ?? width)

  const schematicSvg = convertCircuitJsonToSchematicSvg(schematicElements, {
    ...schematicOptions,
    width: finalWidth,
    height: schematicHeight,
    includeVersion: false,
  })
  const schematicNode = ensureElementNode(parseSync(schematicSvg))

  const combinedChildren: SvgObject[] = []
  combinedChildren.push(
    translateNestedSvg(schematicNode, 0, 0, finalWidth, schematicHeight),
  )
  combinedChildren.push(
    translateNestedSvg(
      simulationNode,
      0,
      schematicHeight,
      finalWidth,
      simulationHeight,
    ),
  )

  const softwareUsedString = getSoftwareUsedString(schematicElements)

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: formatNumber(finalWidth),
      height: formatNumber(height),
      viewBox: `0 0 ${formatNumber(finalWidth)} ${formatNumber(height)}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION,
      }),
    },
    children: combinedChildren,
  }

  return stringify(svgObject)
}

function translateNestedSvg(
  node: SvgObject,
  x: number,
  y: number,
  width: number,
  height: number,
): SvgObject {
  const clone = cloneSvgObject(node)
  clone.attributes = {
    ...clone.attributes,
    x: formatNumber(x),
    y: formatNumber(y),
    width: formatNumber(width),
    height: formatNumber(height),
  }

  delete clone.attributes.xmlns
  return clone
}

function ensureElementNode(node: SvgObject): SvgObject {
  if (node.type !== "element") {
    throw new Error("Expected SVG root element to be of type 'element'")
  }
  return node
}

function cloneSvgObject(node: SvgObject): SvgObject {
  return {
    ...node,
    attributes: { ...(node.attributes ?? {}) },
    children: node.children?.map(cloneSvgObject) ?? [],
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SCHEMATIC_RATIO
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Number.parseFloat(value.toFixed(6))
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toString()
}
