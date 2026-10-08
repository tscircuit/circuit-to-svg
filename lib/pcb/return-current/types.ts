import type { Asset, SimulationReturnCurrentGridJson } from "circuit-json"

export interface PcbReturnCurrentOptions {
  /** Opacity of the heatmap. Defaults to 0.65. */
  opacity?: number
  /** Show current directions at the excitation's positive-current peak. */
  showVectors?: boolean
  /** Decoded field assets, indexed by simulation_pcb_return_current_field_id. */
  fieldData?: Readonly<Record<string, SimulationReturnCurrentGridJson>>
  /** Common linear scale for through-thickness average density in A/mm². Defaults to the field maximum. */
  densityRange?: { min: number; max: number }
  /** Show the result frequency, layer, units, and color legend. Defaults to true. */
  showLegend?: boolean
}

export interface PcbReturnCurrentAssetOptions {
  /** Resolve external assets explicitly; no network requests occur by default. */
  resolveAsset?: (asset: Asset) => Promise<Uint8Array | string>
}
