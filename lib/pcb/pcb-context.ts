export interface PcbContext {
  transform: import("transformation-matrix").Matrix
  layer?: "top" | "bottom"
}
