import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 50,
    height: 40,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    layer: "top" as const,
    shape: "polygon" as const,
    points: [
      { x: -5, y: -3 },
      { x: 0, y: 4 },
      { x: 5, y: -3 },
    ],
  },
]

const Component = () => {
  const result = convertCircuitJsonToPcbSvg(circuit)
  // biome-ignore lint/security/noDangerouslySetInnerHtml: example rendering
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default <Component />
