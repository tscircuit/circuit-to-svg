import { convertCircuitJsonToPcbSvg } from "./lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad0",
    shape: "rect",
    width: 1,
    height: 1,
    x: 0,
    y: 0,
  },
  {
    type: "pcb_via",
    pcb_via_id: "via0",
    x: 2,
    y: 0,
    hole_diameter: 0.5,
    outer_diameter: 1,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
]

const svg = convertCircuitJsonToPcbSvg(circuit, {
  drawPaddingOutsideBoard: false,
})

console.log("SVG Output:")
console.log(svg)
console.log("\n\nSearching for 'pcb-pad':", svg.includes("pcb-pad"))
console.log("Searching for '#ffffff':", svg.includes("#ffffff"))
console.log("Searching for '#ff0000':", svg.includes("#ff0000"))
