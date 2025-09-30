import type { AnyCircuitElement, SimulationExperiment } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { stringify, parseSync } from "svgson"
import { convertCircuitJsonToSchematicSvg } from "lib/sch/convert-circuit-json-to-schematic-svg"
import { convertCircuitJsonToSimulationGraphSvg } from "./convert-circuit-json-to-simulation-graph-svg"

export type CombinedOrientation = "simulation_on_bottom" | "simulation_on_right"

export interface ConvertCircuitJsonToSchematicAndSimulationGraphSvgArgs {
  circuitJson: AnyCircuitElement[]
  simulation_experiment_id: string
  orientation?: CombinedOrientation
  gap?: number
  includeVersion?: boolean
  schematicOptions?: Parameters<typeof convertCircuitJsonToSchematicSvg>[1]
  simulationGraphOptions?: Omit<
    Parameters<typeof convertCircuitJsonToSimulationGraphSvg>[0],
    "circuitJson" | "simulation_experiment_id"
  >
}

const parseDimension = (value: string | undefined, fallback: number) => {
  if (typeof value !== "string") return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const cloneChildren = (children: SvgObject["children"] | undefined) =>
  children ? (JSON.parse(JSON.stringify(children)) as SvgObject[]) : []

const svgRootToGroup = (svg: SvgObject, extraClass: string): SvgObject => {
  const { attributes = {}, children } = svg
  const {
    width: _width,
    height: _height,
    xmlns: _xmlns,
    viewBox: _viewBox,
    x: _x,
    y: _y,
    ...rest
  } = attributes

  const attributesCopy: Record<string, string> = {
    ...rest,
  }

  if (attributesCopy.class) {
    attributesCopy.class = `${attributesCopy.class} ${extraClass}`
  } else {
    attributesCopy.class = extraClass
  }

  return {
    name: "g",
    type: "element",
    attributes: attributesCopy,
    value: "",
    children: cloneChildren(children),
  }
}

const combineTransform = (
  translation: { x: number; y: number },
  existing?: string,
) => {
  const translate = `translate(${translation.x.toFixed(2)} ${translation.y.toFixed(2)})`
  return existing ? `${translate} ${existing}` : translate
}

export function convertCircuitJsonToSchematicAndSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  orientation = "simulation_on_bottom",
  gap = 48,
  includeVersion,
  schematicOptions,
  simulationGraphOptions,
}: ConvertCircuitJsonToSchematicAndSimulationGraphSvgArgs): string {
  const schematicSvgString = convertCircuitJsonToSchematicSvg(
    circuitJson,
    schematicOptions,
  )

  const simulationSvgString = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id,
    ...(simulationGraphOptions ?? {}),
  })

  const schematicSvgObject = parseSync(schematicSvgString) as SvgObject
  const simulationSvgObject = parseSync(simulationSvgString) as SvgObject

  const schematicWidth = parseDimension(
    schematicSvgObject.attributes?.width,
    1200,
  )
  const schematicHeight = parseDimension(
    schematicSvgObject.attributes?.height,
    600,
  )
  const simulationWidth = parseDimension(
    simulationSvgObject.attributes?.width,
    1200,
  )
  const simulationHeight = parseDimension(
    simulationSvgObject.attributes?.height,
    320,
  )

  const schematicGroup = svgRootToGroup(schematicSvgObject, "schematic-section")
  const simulationGroup = svgRootToGroup(
    simulationSvgObject,
    "simulation-graph-section",
  )

  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      element.type === "simulation_experiment" &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const softwareUsedString = getSoftwareUsedString(circuitJson)
  const version = CIRCUIT_TO_SVG_VERSION

  const safeGap = Math.max(gap, 0)

  let width: number
  let height: number
  let schematicTranslation: { x: number; y: number }
  let simulationTranslation: { x: number; y: number }

  if (orientation === "simulation_on_right") {
    width = schematicWidth + safeGap + simulationWidth
    height = Math.max(schematicHeight, simulationHeight)
    schematicTranslation = {
      x: 0,
      y: (height - schematicHeight) / 2,
    }
    simulationTranslation = {
      x: schematicWidth + safeGap,
      y: (height - simulationHeight) / 2,
    }
  } else {
    width = Math.max(schematicWidth, simulationWidth)
    height = schematicHeight + safeGap + simulationHeight
    schematicTranslation = {
      x: (width - schematicWidth) / 2,
      y: 0,
    }
    simulationTranslation = {
      x: (width - simulationWidth) / 2,
      y: schematicHeight + safeGap,
    }
  }

  schematicGroup.attributes.transform = combineTransform(
    schematicTranslation,
    schematicGroup.attributes.transform,
  )
  simulationGroup.attributes.transform = combineTransform(
    simulationTranslation,
    simulationGroup.attributes.transform,
  )

  schematicGroup.attributes["data-embedded-kind"] = "schematic"
  simulationGroup.attributes["data-embedded-kind"] = "simulation"

  const svgChildren: SvgObject[] = [
    {
      name: "style",
      type: "element",
      attributes: {},
      value: "",
      children: [
        {
          type: "text",
          value: `
            .schematic-and-simulation-svg { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; }
            .schematic-and-simulation-background { fill: #f5f1ed; }
          `,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    },
    {
      name: "rect",
      type: "element",
      attributes: {
        class: "schematic-and-simulation-background",
        x: "0",
        y: "0",
        width: width.toString(),
        height: height.toString(),
        rx: "12",
        ry: "12",
      },
      value: "",
      children: [],
    },
    schematicGroup,
    simulationGroup,
  ]

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: width.toString(),
      height: height.toString(),
      viewBox: `0 0 ${width} ${height}`,
      class: "schematic-and-simulation-svg",
      "data-simulation-experiment-id": simulation_experiment_id,
      ...(experiment && {
        "data-simulation-experiment-type": experiment.experiment_type,
      }),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    value: "",
    children: svgChildren,
  }

  return stringify(svgObject)
}

export default convertCircuitJsonToSchematicAndSimulationGraphSvg
