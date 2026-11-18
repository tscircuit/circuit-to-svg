import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
} from "lib"
import loraDeviceU1 from "../fixtures/lora-device-u1/circuit.json"

test("LoRa device U1 assembly pin-1 marker disagrees with the placed pad", () => {
  const circuitJson = loraDeviceU1 as AnyCircuitElement[]
  const component = circuitJson.find(
    (element) => element.type === "pcb_component",
  )!
  const firstPort = circuitJson.find((element) => element.type === "pcb_port")!
  const sourcePort = circuitJson.find(
    (element) =>
      element.type === "source_port" &&
      element.source_port_id === firstPort.source_port_id,
  )!

  // Pin 1 is already first, so this isolates rotation from port ordering.
  expect(sourcePort.type === "source_port" && sourcePort.pin_number).toBe(1)
  expect(component.rotation).toBe(180)
  expect(firstPort.x).toBeGreaterThan(component.center.x)
  expect(firstPort.y).toBeLessThan(component.center.y)

  // Current assembly output puts the triangle at the opposite (top-left)
  // corner. The numbered PCB snapshot shows the actual pin 1 at bottom-right.
  expect(convertCircuitJsonToAssemblySvg([...circuitJson])).toMatchSvgSnapshot(
    import.meta.path,
  )
  expect(
    convertCircuitJsonToPcbSvg([...circuitJson], { showPinNumbers: true }),
  ).toMatchSvgSnapshot(`${import.meta.path} - pcb`)
})
