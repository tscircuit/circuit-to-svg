import {
  getSimulationReturnCurrentGridJsonSchema,
  simulation_pcb_return_current_field,
  simulation_return_current_image_asset,
  type AnyCircuitElement,
  type Asset,
} from "circuit-json"
import {
  convertCircuitJsonToPcbSvg,
  type PcbSvgOptions,
} from "../convert-circuit-json-to-pcb-svg"
import { getReturnCurrentResult } from "./create-return-current-svg-objects"
import type { PcbReturnCurrentAssetOptions } from "./types"

function decodeDataUrl(url: string): Uint8Array {
  const match = /^data:([^,]*),(.*)$/s.exec(url)
  if (!match) throw new Error("Invalid simulation asset data URL")
  return match[1]!.split(";").includes("base64")
    ? Uint8Array.from(atob(match[2]!), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[2]!))
}

async function assetBytes(asset: Asset, options: PcbReturnCurrentAssetOptions) {
  if (asset.url.startsWith("data:")) return decodeDataUrl(asset.url)
  if (!options.resolveAsset)
    throw new Error(
      `External simulation asset '${asset.project_relative_path}' requires resolveAsset`,
    )
  const bytes = await options.resolveAsset(asset)
  return typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes
}

/** Load only the selected result/layer's assets. No implicit network or filesystem access. */
export async function convertCircuitJsonToPcbSimulationSvg(
  circuitJson: AnyCircuitElement[],
  options: PcbSvgOptions &
    PcbReturnCurrentAssetOptions & { simulationResultId: string },
): Promise<string> {
  getReturnCurrentResult(circuitJson, options.simulationResultId)
  const fieldData = { ...options.returnCurrent?.fieldData }
  const resolved = await Promise.all(
    circuitJson.map(async (element) => {
      if (
        !("simulation_pcb_return_current_result_id" in element) ||
        element.simulation_pcb_return_current_result_id !==
          options.simulationResultId ||
        !("layer" in element) ||
        (options.layer && element.layer !== options.layer)
      )
        return element
      if (element.type === "simulation_pcb_return_current_field") {
        const field = simulation_pcb_return_current_field.parse(element)
        const id = field.simulation_pcb_return_current_field_id
        if (fieldData[id]) return element
        let bytes = await assetBytes(field.field_asset, options)
        if (field.field_asset.mimetype === "application/gzip") {
          bytes = new Uint8Array(
            await new Response(
              new Blob([bytes])
                .stream()
                .pipeThrough(new DecompressionStream("gzip")),
            ).arrayBuffer(),
          )
        }
        fieldData[id] = getSimulationReturnCurrentGridJsonSchema(field).parse(
          JSON.parse(new TextDecoder().decode(bytes)),
        )
      }
      if (
        element.type === "simulation_pcb_return_current_heatmap" &&
        options.resolveAsset &&
        !element.image_asset.url.startsWith("data:")
      ) {
        const asset = simulation_return_current_image_asset.parse(
          element.image_asset,
        )
        const bytes = await assetBytes(asset, options)
        let binary = ""
        for (const byte of bytes) binary += String.fromCharCode(byte)
        return {
          ...element,
          image_asset: {
            ...asset,
            url: `data:${asset.mimetype};base64,${btoa(binary)}`,
          },
        }
      }
      return element
    }),
  )
  return convertCircuitJsonToPcbSvg(resolved, {
    ...options,
    returnCurrent: { ...options.returnCurrent, fieldData },
  })
}
