import "circuit-json"

declare module "circuit-json" {
  interface PcbNoteDimension {
    offset_distance?: number
    offset_direction?: { x: number; y: number }
  }

  interface PcbFabricationNoteDimension {
    offset_distance?: number
    offset_direction?: { x: number; y: number }
  }
}
