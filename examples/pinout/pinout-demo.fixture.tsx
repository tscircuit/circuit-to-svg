import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPinoutSvg } from "../../lib/index"

// Demo data uses pinout_color which is a proposed extension to circuit-json,
// so we type the array broadly and cast when passing to the function
const circuitJson: Record<string, unknown>[] = [
  // Board
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 12,
    height: 8,
  },
  // Board title
  {
    type: "source_board",
    source_board_id: "source_board_0",
    title: "ATmega328P Pinout Demo",
  },

  // === Left side pins (with colors and multi-labels) ===
  {
    type: "source_port",
    source_port_id: "sp_0",
    name: "PD0",
    port_hints: ["PD0", "RXD", "PCINT16"],
    pinout_color: "#e74c3c",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_0",
    source_port_id: "sp_0",
    x: -6,
    y: -3,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -6,
    y: -3,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_0",
  },

  {
    type: "source_port",
    source_port_id: "sp_1",
    name: "PD1",
    port_hints: ["PD1", "TXD", "PCINT17"],
    pinout_color: "#e74c3c",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_1",
    source_port_id: "sp_1",
    x: -6,
    y: -1.5,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -6,
    y: -1.5,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_1",
  },

  {
    type: "source_port",
    source_port_id: "sp_2",
    name: "PD2",
    port_hints: ["PD2", "INT0", "PCINT18"],
    pinout_color: "#2ecc71",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_2",
    source_port_id: "sp_2",
    x: -6,
    y: 0,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -6,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_2",
  },

  {
    type: "source_port",
    source_port_id: "sp_3",
    name: "PD3",
    port_hints: ["PD3", "INT1", "OC2B"],
    pinout_color: "#2ecc71",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_3",
    source_port_id: "sp_3",
    x: -6,
    y: 1.5,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -6,
    y: 1.5,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_3",
  },

  {
    type: "source_port",
    source_port_id: "sp_4",
    name: "VCC",
    port_hints: ["VCC"],
    pinout_color: "#e74c3c",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_4",
    source_port_id: "sp_4",
    x: -6,
    y: 3,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -6,
    y: 3,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_4",
  },

  // === Right side pins ===
  {
    type: "source_port",
    source_port_id: "sp_5",
    name: "PB0",
    port_hints: ["PB0", "ICP1", "CLKO"],
    pinout_color: "#3498db",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_5",
    source_port_id: "sp_5",
    x: 6,
    y: -3,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 6,
    y: -3,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_5",
  },

  {
    type: "source_port",
    source_port_id: "sp_6",
    name: "PB1",
    port_hints: ["PB1", "OC1A"],
    pinout_color: "#3498db",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_6",
    source_port_id: "sp_6",
    x: 6,
    y: -1.5,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 6,
    y: -1.5,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_6",
  },

  {
    type: "source_port",
    source_port_id: "sp_7",
    name: "PB2",
    port_hints: ["PB2", "SS", "OC1B"],
    pinout_color: "#9b59b6",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_7",
    source_port_id: "sp_7",
    x: 6,
    y: 0,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 6,
    y: 0,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_7",
  },

  {
    type: "source_port",
    source_port_id: "sp_8",
    name: "PB3",
    port_hints: ["PB3", "MOSI", "OC2A"],
    pinout_color: "#9b59b6",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_8",
    source_port_id: "sp_8",
    x: 6,
    y: 1.5,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 6,
    y: 1.5,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_8",
  },

  {
    type: "source_port",
    source_port_id: "sp_9",
    name: "GND",
    port_hints: ["GND"],
    pinout_color: "#2c3e50",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_9",
    source_port_id: "sp_9",
    x: 6,
    y: 3,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 6,
    y: 3,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_9",
  },

  // === Top pins ===
  {
    type: "source_port",
    source_port_id: "sp_10",
    name: "AREF",
    port_hints: ["AREF"],
    pinout_color: "#f39c12",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_10",
    source_port_id: "sp_10",
    x: -2,
    y: -4,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -2,
    y: -4,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_10",
  },

  {
    type: "source_port",
    source_port_id: "sp_11",
    name: "AVCC",
    port_hints: ["AVCC"],
    pinout_color: "#f39c12",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp_11",
    source_port_id: "sp_11",
    x: 2,
    y: -4,
    is_board_pinout: true,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 2,
    y: -4,
    width: 0.5,
    height: 0.5,
    layer: "top",
    pcb_port_id: "pp_11",
  },
]

const Component = () => {
  const result = convertCircuitJsonToPinoutSvg(
    circuitJson as AnyCircuitElement[],
  )
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default <Component />
