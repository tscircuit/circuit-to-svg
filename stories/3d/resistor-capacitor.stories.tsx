import { convertCircuitJsonTo3dSvg } from "../../lib/index.js"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(<board width="10mm" height="10mm">
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      pcbRotation={90}
    />
    <resistor
      name="R1"
      footprint={"0402"}
      resistance={"1k"}
      pcbX={5}
      pcbY={2}
    />
    <resistor
      name="R2"
      footprint={"0402"}
      resistance={"1k"}
      pcbX={5}
      pcbY={0}
    />
  </board>)

  return circuit.getCircuitJson()
}

export const ResistorCapacitorPcb = () => {
  const result = convertCircuitJsonTo3dSvg(createCircuit())

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "",
  component: ResistorCapacitorPcb
}
