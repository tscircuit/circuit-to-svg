/**
 * tscircuit - board-edge-chamfer
 */
export function chamferCorner(x: number, y: number, size: number) { return `M ${x+size} ${y} L ${x} ${y+size}`; }
