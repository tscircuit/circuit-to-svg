import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"

export const getSourcePortForPcbPort = (
  pcbPortId: string,
  soup: AnyCircuitElement[],
) => {
  return su(soup).source_port.getWhere({ pcb_port_id: pcbPortId })
}
