import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
} from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// U1 pad geometry from gokul/lora-device v0.1.6:
// https://tscircuit.com/gokul/lora-device
// Each entry is [pin number, x, y, width, height] before PCB rotation.
const pads: [number, number, number, number, number][] = [
  [1, -8.899779, 9.1046427, 1.499997, 0.8999982],
  [2, -8.899779, 7.8346427, 1.499997, 0.8999982],
  [3, -8.899779, 6.5646427, 1.499997, 0.8999982],
  [4, -8.899779, 5.2946427, 1.499997, 0.8999982],
  [5, -8.899779, 4.0246427, 1.499997, 0.8999982],
  [6, -8.899779, 2.7546427, 1.499997, 0.8999982],
  [7, -8.899779, 1.4846427, 1.499997, 0.8999982],
  [8, -8.899779, 0.2146427, 1.499997, 0.8999982],
  [9, -8.899779, -1.0553573, 1.499997, 0.8999982],
  [10, -8.899779, -2.3253573, 1.499997, 0.8999982],
  [11, -8.899779, -3.5953573, 1.499997, 0.8999982],
  [12, -8.899779, -4.8653573, 1.499997, 0.8999982],
  [13, -8.899779, -6.1353573, 1.499997, 0.8999982],
  [14, -8.899779, -7.4053573, 1.499997, 0.8999982],
  [15, -6.984873, -8.8046433, 0.8999982, 1.499997],
  [16, -5.714873, -8.8046433, 0.8999982, 1.499997],
  [17, -4.444873, -8.8046433, 0.8999982, 1.499997],
  [18, -3.174873, -8.8046433, 0.8999982, 1.499997],
  [19, -1.904873, -8.8046433, 0.8999982, 1.499997],
  [20, -0.634873, -8.8046433, 0.8999982, 1.499997],
  [21, 0.635127, -8.8046433, 0.8999982, 1.499997],
  [22, 1.905127, -8.8046433, 0.8999982, 1.499997],
  [23, 3.175127, -8.8046433, 0.8999982, 1.499997],
  [24, 4.445127, -8.8046433, 0.8999982, 1.499997],
  [25, 5.715127, -8.8046433, 0.8999982, 1.499997],
  [26, 6.985127, -8.8046433, 0.8999982, 1.499997],
  [27, 8.899779, -7.4053573, 1.499997, 0.8999982],
  [28, 8.899779, -6.1353573, 1.499997, 0.8999982],
  [29, 8.899779, -4.8653573, 1.499997, 0.8999982],
  [30, 8.899779, -3.5953573, 1.499997, 0.8999982],
  [31, 8.899779, -2.3253573, 1.499997, 0.8999982],
  [32, 8.899779, -1.0553573, 1.499997, 0.8999982],
  [33, 8.899779, 0.2146427, 1.499997, 0.8999982],
  [34, 8.899779, 1.4846427, 1.499997, 0.8999982],
  [35, 8.899779, 2.7546427, 1.499997, 0.8999982],
  [36, 8.899779, 4.0246427, 1.499997, 0.8999982],
  [37, 8.899779, 5.2946427, 1.499997, 0.8999982],
  [38, 8.899779, 6.5646427, 1.499997, 0.8999982],
  [39, 8.899779, 7.8346427, 1.499997, 0.8999982],
  [40, 8.899779, 9.1046427, 1.499997, 0.8999982],
  [41, -1.499489, 1.3850747, 0.8999982, 0.8999982],
  [41, -2.899537, 1.3850747, 0.8999982, 0.8999982],
  [41, -0.099441, 1.3850747, 0.8999982, 0.8999982],
  [41, -0.099441, 2.7851227, 0.8999982, 0.8999982],
  [41, -1.499489, 2.7851227, 0.8999982, 0.8999982],
  [41, -2.899537, 2.7851227, 0.8999982, 0.8999982],
  [41, -2.899537, -0.0149733, 0.8999982, 0.8999982],
  [41, -1.499489, -0.0149733, 0.8999982, 0.8999982],
  [41, -0.099441, -0.0149733, 0.8999982, 0.8999982],
]

test("LoRa device U1 assembly pin-1 marker disagrees with the placed pad", () => {
  const { circuit } = getTestFixture()
  circuit.add(
    <board width={24} height={24}>
      <chip
        name="U1"
        manufacturerPartNumber="ESP32-S3-WROOM-1-N8"
        pcbRotation={180}
        footprint={
          <footprint>
            {pads.map(([pin, x, y, width, height]) => (
              <smtpad
                portHints={[`pin${pin}`]}
                pcbX={x}
                pcbY={y}
                width={width}
                height={height}
                shape="rect"
              />
            ))}
          </footprint>
        }
      />
    </board>,
  )
  const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[]
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
