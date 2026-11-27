import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPort } from "circuit-json"

const PIN1_PORT_HINTS = new Set(["1", "pin1", "pin_1", "a1"])

function isPin1Identifier(identifier?: string | number | null): boolean {
  if (identifier === undefined || identifier === null) return false
  return PIN1_PORT_HINTS.has(String(identifier).trim().toLowerCase())
}

function hasPin1Hint(hints?: readonly (string | number)[] | null): boolean {
  if (!hints) return false
  return hints.some((hint) => isPin1Identifier(hint))
}

export function findPin1Port(options: {
  ports: PcbPort[]
  soup: AnyCircuitElement[]
  fallbackPort: PcbPort
}): PcbPort {
  const { ports, soup, fallbackPort } = options
  const db = su(soup)

  for (const port of ports) {
    const sourcePort = port.source_port_id
      ? db.source_port.get(port.source_port_id)
      : undefined
    if (sourcePort?.pin_number === 1) return port
  }

  for (const port of ports) {
    const sourcePort = port.source_port_id
      ? db.source_port.get(port.source_port_id)
      : undefined
    if (
      hasPin1Hint(sourcePort?.port_hints) ||
      isPin1Identifier(sourcePort?.name)
    ) {
      return port
    }
  }

  for (const pad of db.pcb_smtpad.list()) {
    if (!pad.pcb_port_id || !hasPin1Hint(pad.port_hints)) continue
    const matchedPort = ports.find(
      (port) => port.pcb_port_id === pad.pcb_port_id,
    )
    if (matchedPort) return matchedPort
  }

  for (const hole of db.pcb_plated_hole.list()) {
    if (!hole.pcb_port_id || !hasPin1Hint(hole.port_hints)) continue
    const matchedPort = ports.find(
      (port) => port.pcb_port_id === hole.pcb_port_id,
    )
    if (matchedPort) return matchedPort
  }

  return fallbackPort
}
