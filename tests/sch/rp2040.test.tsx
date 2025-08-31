import { expect, test } from "bun:test"
import { createUseComponent } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const pinLabels = {
  pin1: ["IOVDD1"],
  pin2: ["GPIO0"],
  pin3: ["GPIO1"],
  pin4: ["GPIO2"],
  pin5: ["GPIO3"],
  pin6: ["GPIO4"],
  pin7: ["GPIO5"],
  pin8: ["GPIO6"],
  pin9: ["GPIO7"],
  pin10: ["IOVDD2"],
  pin11: ["GPIO8"],
  pin12: ["GPIO9"],
  pin13: ["GPIO10"],
  pin14: ["GPIO11"],
  pin15: ["GPIO12"],
  pin16: ["GPIO13"],
  pin17: ["GPIO14"],
  pin18: ["GPIO15"],
  pin19: ["TESTEN"],
  pin20: ["XIN"],
  pin21: ["XOUT"],
  pin22: ["IOVDD3"],
  pin23: ["DVDD1"],
  pin24: ["SWCLK"],
  pin25: ["SWD"],
  pin26: ["RUN"],
  pin27: ["GPIO16"],
  pin28: ["GPIO17"],
  pin29: ["GPIO18"],
  pin30: ["GPIO19"],
  pin31: ["GPIO20"],
  pin32: ["GPIO21"],
  pin33: ["IOVDD4"],
  pin34: ["GPIO22"],
  pin35: ["GPIO23"],
  pin36: ["GPIO24"],
  pin37: ["GPIO25"],
  pin38: ["GPIO26_ADC0", "GPIO26", "ADC0"],
  pin39: ["GPIO27_ADC1", "GPIO27", "ADC1"],
  pin40: ["GPIO28_ADC2", "GPIO28", "ADC2"],
  pin41: ["GPIO29_ADC3", "GPIO29", "ADC3"],
  pin42: ["IOVDD5"],
  pin43: ["ADC_IOVDD"],
  pin44: ["VREG_IOVDD"],
  pin45: ["VREG_VOUT"],
  pin46: ["USB_DM"],
  pin47: ["USB_DP"],
  pin48: ["USB_IOVDD"],
  pin49: ["IOVDD6"],
  pin50: ["DVDD2"],
  pin51: ["QSPI_SD3"],
  pin52: ["QSPI_SCLK"],
  pin53: ["QSPI_SD0"],
  pin54: ["QSPI_SD2"],
  pin55: ["QSPI_SD1"],
  pin56: ["QSPI_SS_N"],
  pin57: ["GND", "thermalpad"],
} as const

const RP2040 = (props: { name: string }) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    manufacturerPartNumber="RP2040"
    schPortArrangement={{
      leftSide: {
        pins: [
          "QSPI_SS_N",
          "QSPI_SD0",
          "QSPI_SD1",
          "QSPI_SD2",
          "QSPI_SD3",
          "QSPI_SCLK",
          "XIN",
          "XOUT",
          "RUN",
          "SWCLK",
          "SWD",
        ],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [
          "USB_DP",
          "USB_DM",
          "GPIO0",
          "GPIO1",
          "GPIO2",
          "GPIO3",
          "GPIO4",
          "GPIO5",
          "GPIO6",
          "GPIO7",
          "GPIO8",
          "GPIO9",
          "GPIO10",
          "GPIO11",
          "GPIO12",
          "GPIO13",
          "GPIO14",
          "GPIO15",
          "GPIO16",
          "GPIO17",
          "GPIO18",
          "GPIO19",
          "GPIO20",
          "GPIO21",
          "GPIO22",
          "GPIO23",
          "GPIO24",
          "GPIO25",
          "GPIO26_ADC0",
          "GPIO27_ADC1",
          "GPIO28_ADC2",
          "GPIO29_ADC3",
        ],
        direction: "top-to-bottom",
      },
      topSide: {
        pins: [
          "DVDD1",
          "DVDD2",
          "VREG_VOUT",
          "VREG_IOVDD",
          "IOVDD1",
          "IOVDD2",
          "IOVDD3",
          "IOVDD4",
          "IOVDD5",
          "IOVDD6",
          "USB_IOVDD",
          "ADC_IOVDD",
        ],
        direction: "left-to-right",
      },
      bottomSide: {
        pins: ["TESTEN", "GND"],
        direction: "left-to-right",
      },
    }}
    schPinStyle={{
      pin38: {
        topMargin: 0.5,
      },
      pin57: {
        leftMargin: 0.5,
      },
      pin20: {
        topMargin: 1,
      },
      pin26: {
        topMargin: 0.2,
      },
      pin24: { topMargin: 0.2 },
      pin45: { leftMargin: 0.2 },
      pin49: { leftMargin: 0.2 },
      pin48: { leftMargin: 0.2 },
      pin43: { leftMargin: 0.2, rightMargin: 1 },
      pin2: { topMargin: 0.2 },
      pin47: { topMargin: 0.2 },
    }}
    footprint="qfn56_pw0.2_p0.4_pl0.875_w7.75_h7.75_thermalpad3.2mmx3.2mm"
  />
)

test(
  "RP2040 schematic",
  () => {
    const { circuit } = getTestFixture()

    circuit.add(
      <board width="10mm" height="10mm">
        <RP2040 name="U1" />
      </board>,
    )

    const circuitJson = circuit.getCircuitJson()

    expect(
      convertCircuitJsonToSchematicSvg(circuitJson as any, {
        grid: {
          cellSize: 1,
          labelCells: true,
        },
      }),
    ).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 10_000 },
)
