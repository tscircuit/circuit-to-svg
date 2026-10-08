import type { Asset, SimulationReturnCurrentGridJson } from "circuit-json"

export interface PcbReturnCurrentOptions {
  /** Opacity of the heatmap. Defaults to 0.65. */
  opacity?: number
  /** Show instantaneous vector directions at the selected phase. */
  showVectors?: boolean
  /** Phase in degrees, using the exp(+jωt) convention. Defaults to zero. */
  phaseDegrees?: number
  /** Decoded field assets, indexed by simulation_pcb_return_current_field_id. */
  fieldData?: Readonly<Record<string, SimulationReturnCurrentGridJson>>
  /** Optional common linear color scale in A/mm². Otherwise uses the field maximum. */
  densityRange?: { min: number; max: number }
  /** Show the result frequency, layer, units, and color legend. Defaults to true. */
  showLegend?: boolean
}

export interface PcbReturnCurrentAssetOptions {
  /** Resolve external assets explicitly; no network requests occur by default. */
  resolveAsset?: (asset: Asset) => Promise<Uint8Array | string>
}
