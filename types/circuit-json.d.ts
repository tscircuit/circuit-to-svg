import "circuit-json"

declare module "circuit-json" {
  interface PcbBoard {
    min_via_hole_diameter?: number | string
    min_via_pad_diameter?: number | string
  }

  interface PcbNoteDimension {
    offset_distance?: number
    offset_direction?: { x: number; y: number }
  }

  interface PcbFabricationNoteDimension {
    offset_distance?: number
    offset_direction?: { x: number; y: number }
  }
}
