import { convertCircuitJsonToSchematicSvg } from "../../lib/index.js"
import circuitJson from "../assets/schematic-trace.json"

const Component = () => {
  const result = convertCircuitJsonToSchematicSvg(circuitJson as any)

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default <Component />
