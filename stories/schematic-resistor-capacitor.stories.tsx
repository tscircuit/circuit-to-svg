import { convertCircuitJsonToSchematicSvg } from "../lib/index.js"

const soup: any = [
  {
    type: "source_port",
    source_port_id: "source_port_0",
    name: "pin1",
    pin_number: 1,
    port_hints: ["anode", "pos", "pin1", "1"],
    source_component_id: "source_component_0",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    name: "pin2",
    pin_number: 2,
    port_hints: ["cathode", "neg", "pin2", "2"],
    source_component_id: "source_component_0",
  },
  {
    type: "source_component",
    source_component_id: "source_component_0",
    ftype: "simple_resistor",
    name: "R1",
    resistance: 100000,
  },
  {
    type: "source_port",
    source_port_id: "source_port_2",
    name: "pin1",
    pin_number: 1,
    port_hints: ["anode", "pos", "pin1", "1"],
    source_component_id: "source_component_1",
  },
  {
    type: "source_port",
    source_port_id: "source_port_3",
    name: "pin2",
    pin_number: 2,
    port_hints: ["cathode", "neg", "pin2", "2"],
    source_component_id: "source_component_1",
  },
  {
    type: "source_component",
    source_component_id: "source_component_1",
    ftype: "simple_capacitor",
    name: "C1",
    capacitance: 0.0001,
  },
  {
    type: "source_port",
    source_port_id: "source_port_4",
    name: "pin29",
    pin_number: 29,
    port_hints: ["pin29", "29"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_5",
    name: "pin7",
    pin_number: 7,
    port_hints: ["pin7", "7", "GND"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_6",
    name: "pin8",
    pin_number: 8,
    port_hints: ["pin8", "8", "-V+"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_7",
    name: "pin20",
    pin_number: 20,
    port_hints: ["pin20", "20"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_8",
    name: "pin19",
    pin_number: 19,
    port_hints: ["pin19", "19"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_9",
    name: "pin22",
    pin_number: 22,
    port_hints: ["pin22", "22"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_10",
    name: "pin12",
    pin_number: 12,
    port_hints: ["pin12", "12"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_11",
    name: "pin13",
    pin_number: 13,
    port_hints: ["pin13", "13"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_12",
    name: "pin14",
    pin_number: 14,
    port_hints: ["pin14", "14"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_13",
    name: "pin15",
    pin_number: 15,
    port_hints: ["pin15", "15"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_14",
    name: "pin16",
    pin_number: 16,
    port_hints: ["pin16", "16"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_15",
    name: "pin17",
    pin_number: 17,
    port_hints: ["pin17", "17"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_16",
    name: "pin23",
    pin_number: 23,
    port_hints: ["pin23", "23"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_17",
    name: "pin4",
    pin_number: 4,
    port_hints: ["pin4", "4"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_18",
    name: "pin18",
    pin_number: 18,
    port_hints: ["pin18", "18"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_19",
    name: "pin2",
    pin_number: 2,
    port_hints: ["pin2", "2"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_20",
    name: "pin3",
    pin_number: 3,
    port_hints: ["pin3", "3"],
    source_component_id: "source_component_2",
  },
  {
    type: "source_component",
    source_component_id: "source_component_2",
    ftype: "simple_chip",
    name: "U2",
    manufacturer_part_number: "ATmega8-16A",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: ["source_port_1", "source_port_2"],
    connected_source_net_ids: [],
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_0",
    center: {
      x: -2,
      y: 0,
    },
    rotation: 0,
    size: {
      width: 1.0583332999999997,
      height: 1,
    },
    source_component_id: "source_component_0",
    symbol_name: "boxresistor_horz",
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_1",
    center: {
      x: 2,
      y: 0,
    },
    rotation: 0,
    size: {
      width: 1.0583333000000001,
      height: 0.5291665999999999,
    },
    source_component_id: "source_component_1",
    symbol_name: "capacitor_horz",
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 7,
      y: 0,
    },
    rotation: 0,
    size: {
      width: 3,
      height: 7,
    },
    port_arrangement: {
      left_side: {
        pins: [29, 7, 8, 20, 19, 22],
        direction: "top-to-bottom",
      },
      right_side: {
        pins: [12, 13, 14, 15, 16, 17, 23],
        direction: "bottom-to-top",
      },
      top_side: {
        pins: [4, 18],
        direction: "left-to-right",
      },
      bottom_side: {
        pins: [2, 3],
        direction: "left-to-right",
      },
    },
    pin_spacing: 0.2,
    pin_styles: {
      pin22: {
        top_margin: 0.8,
      },
      pin12: {
        bottom_margin: 0.5,
      },
      pin15: {
        top_margin: 0.8,
      },
    },
    port_labels: {
      pin7: "GND",
      pin8: "-V+",
    },
    source_component_id: "source_component_2",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_0",
    schematic_component_id: "schematic_component_0",
    center: {
      x: -2.551106550000001,
      y: 0.0003562000000023602,
    },
    source_port_id: "source_port_0",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    schematic_component_id: "schematic_component_0",
    center: {
      x: -1.4835251500000002,
      y: 0.0009027000000010332,
    },
    source_port_id: "source_port_1",
    facing_direction: "right",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_2",
    schematic_component_id: "schematic_component_1",
    center: {
      x: 1.4550195499999996,
      y: 0.0009026999999992569,
    },
    source_port_id: "source_port_2",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_3",
    schematic_component_id: "schematic_component_1",
    center: {
      x: 2.55743815,
      y: 0.00035620000000058383,
    },
    source_port_id: "source_port_3",
    facing_direction: "right",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_4",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: 3.3,
      trueIndex: 0,
      pinNumber: 29,
      side: "left",
      distanceFromEdge: 0.2,
    },
    source_port_id: "source_port_4",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_5",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: 2.14,
      trueIndex: 1,
      pinNumber: 7,
      side: "left",
      distanceFromEdge: 1.3599999999999999,
    },
    source_port_id: "source_port_5",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_6",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: 0.9800000000000004,
      trueIndex: 2,
      pinNumber: 8,
      side: "left",
      distanceFromEdge: 2.5199999999999996,
    },
    source_port_id: "source_port_6",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_7",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: -0.17999999999999972,
      trueIndex: 3,
      pinNumber: 20,
      side: "left",
      distanceFromEdge: 3.6799999999999997,
    },
    source_port_id: "source_port_7",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_8",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: -1.3399999999999999,
      trueIndex: 4,
      pinNumber: 19,
      side: "left",
      distanceFromEdge: 4.84,
    },
    source_port_id: "source_port_8",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_9",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.5,
      y: -3.3,
      trueIndex: 5,
      pinNumber: 22,
      side: "left",
      distanceFromEdge: 6.8,
    },
    source_port_id: "source_port_9",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_10",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: -3.3,
      trueIndex: 6,
      pinNumber: 12,
      side: "right",
      distanceFromEdge: 0.2,
    },
    source_port_id: "source_port_10",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_11",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: -1.9166666666666667,
      trueIndex: 7,
      pinNumber: 13,
      side: "right",
      distanceFromEdge: 1.5833333333333333,
    },
    source_port_id: "source_port_11",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_12",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: -1.0333333333333332,
      trueIndex: 8,
      pinNumber: 14,
      side: "right",
      distanceFromEdge: 2.466666666666667,
    },
    source_port_id: "source_port_12",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_13",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: 0.6500000000000004,
      trueIndex: 9,
      pinNumber: 15,
      side: "right",
      distanceFromEdge: 4.15,
    },
    source_port_id: "source_port_13",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_14",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: 1.5333333333333332,
      trueIndex: 10,
      pinNumber: 16,
      side: "right",
      distanceFromEdge: 5.033333333333333,
    },
    source_port_id: "source_port_14",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_15",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: 2.416666666666666,
      trueIndex: 11,
      pinNumber: 17,
      side: "right",
      distanceFromEdge: 5.916666666666666,
    },
    source_port_id: "source_port_15",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_16",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.5,
      y: 3.299999999999999,
      trueIndex: 12,
      pinNumber: 23,
      side: "right",
      distanceFromEdge: 6.799999999999999,
    },
    source_port_id: "source_port_16",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_17",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.3,
      y: -3.5,
      trueIndex: 13,
      pinNumber: 4,
      side: "top",
      distanceFromEdge: 0.2,
    },
    source_port_id: "source_port_17",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_18",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.3000000000000003,
      y: -3.5,
      trueIndex: 14,
      pinNumber: 18,
      side: "top",
      distanceFromEdge: 2.8000000000000003,
    },
    source_port_id: "source_port_18",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_19",
    schematic_component_id: "schematic_component_2",
    center: {
      x: -1.3,
      y: 3.5,
      trueIndex: 15,
      pinNumber: 2,
      side: "bottom",
      distanceFromEdge: 0.2,
    },
    source_port_id: "source_port_19",
    facing_direction: "left",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_20",
    schematic_component_id: "schematic_component_2",
    center: {
      x: 1.3000000000000003,
      y: 3.5,
      trueIndex: 16,
      pinNumber: 3,
      side: "bottom",
      distanceFromEdge: 2.8000000000000003,
    },
    source_port_id: "source_port_20",
    facing_direction: "left",
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_0",
    source_trace_id: "source_trace_0",
    edges: [
      {
        from: {
          x: -1.33342515,
          y: 0.0009027000000010332,
          layer: "top",
        },
        to: {
          x: 1.3049195499999997,
          y: 0.0009027000000010332,
          layer: "top",
        },
      },
    ],
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    center: {
      x: -2,
      y: 0,
    },
    width: 1.5999999999999999,
    height: 0.6000000000000001,
    layer: "top",
    rotation: 0,
    source_component_id: "source_component_0",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    center: {
      x: 2,
      y: 0,
    },
    width: 1.5999999999999999,
    height: 0.6000000000000001,
    layer: "top",
    rotation: 0,
    source_component_id: "source_component_1",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_2",
    center: {
      x: 0,
      y: 0,
    },
    width: 0,
    height: 0,
    layer: "top",
    rotation: 0,
    source_component_id: "source_component_2",
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: {
      x: 0,
      y: 0,
    },
    thickness: 1.4,
    num_layers: 4,
    width: 10,
    height: 10,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    pcb_component_id: "pcb_component_0",
    pcb_port_id: "pcb_port_0",
    layer: "top",
    shape: "rect",
    width: 0.6000000000000001,
    height: 0.6000000000000001,
    port_hints: ["1", "left"],
    x: -2.5,
    y: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    pcb_component_id: "pcb_component_0",
    pcb_port_id: "pcb_port_1",
    layer: "top",
    shape: "rect",
    width: 0.6000000000000001,
    height: 0.6000000000000001,
    port_hints: ["2", "right"],
    x: -1.5,
    y: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_2",
    layer: "top",
    shape: "rect",
    width: 0.6000000000000001,
    height: 0.6000000000000001,
    port_hints: ["1", "left"],
    x: 1.5,
    y: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_3",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_3",
    layer: "top",
    shape: "rect",
    width: 0.6000000000000001,
    height: 0.6000000000000001,
    port_hints: ["2", "right"],
    x: 2.5,
    y: 0,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    pcb_component_id: "pcb_component_0",
    layers: ["top"],
    x: -2.5,
    y: 0,
    source_port_id: "source_port_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    pcb_component_id: "pcb_component_0",
    layers: ["top"],
    x: -1.5,
    y: 0,
    source_port_id: "source_port_1",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    pcb_component_id: "pcb_component_1",
    layers: ["top"],
    x: 1.5,
    y: 0,
    source_port_id: "source_port_2",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_3",
    pcb_component_id: "pcb_component_1",
    layers: ["top"],
    x: 2.5,
    y: 0,
    source_port_id: "source_port_3",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    route: [
      {
        route_type: "wire",
        x: -1.5,
        y: 0,
        width: 0.16,
        layer: "top",
        start_pcb_port_id: "pcb_port_1",
      },
      {
        route_type: "wire",
        x: 1.5,
        y: 0,
        width: 0.16,
        layer: "top",
        end_pcb_port_id: "pcb_port_2",
      },
    ],
    source_trace_id: "source_trace_0",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    position: {
      x: -2,
      y: 0,
      z: 0.7,
    },
    rotation: {
      x: 0,
      y: 180,
      z: 0,
    },
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    footprinter_string: "0402",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_1",
    position: {
      x: 2,
      y: 0,
      z: 0.7,
    },
    rotation: {
      x: 0,
      y: 180,
      z: 0,
    },
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    footprinter_string: "0402",
  },
]

export const ResistorCapacitorSch = () => {
  const result = convertCircuitJsonToSchematicSvg(soup)

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Resistor and Capacitor Schematic",
  component: ResistorCapacitorSch,
}
