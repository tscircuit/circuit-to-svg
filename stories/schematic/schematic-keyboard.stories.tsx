import { convertCircuitJsonToSchematicSvg } from "../../lib/index.js"
import circuitJson from "../assets/keyboard.json"

export const ResistorCapacitorSch = () => {
  const result = convertCircuitJsonToSchematicSvg(circuitJson as any)

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Keyboard Schematic",
  component: ResistorCapacitorSch,
}
