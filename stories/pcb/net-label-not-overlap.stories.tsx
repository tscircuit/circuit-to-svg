import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

const soup: any = [
  {
    type: "source_component",
    source_component_id: "simple_bug_0",
    name: "U2",
    supplier_part_numbers: {},
    ftype: "simple_bug",
    schPortArrangement: {
      leftSize: 4,
      rightSize: 4,
      left_size: 4,
      right_size: 4,
    },
    pinLabels: {
      "1": "GND",
      "2": "VBUS",
      "3": "D-",
      "4": "D+",
    },
    sch_port_arrangement: {
      leftSize: 4,
      rightSize: 4,
      left_size: 4,
      right_size: 4,
    },
    pin_labels: {
      "1": "GND",
      "2": "VBUS",
      "3": "D-",
      "4": "D+",
    },
  },
  {
    type: "schematic_component",
    source_component_id: "simple_bug_0",
    schematic_component_id: "schematic_component_simple_bug_0",
    rotation: 0,
    size: {
      width: 1,
      height: 2,
    },
    center: {
      x: 0,
      y: 0,
    },
    port_labels: {
      "1": "GND",
      "2": "VBUS",
      "3": "D-",
      "4": "D+",
    },
    port_arrangement: {
      left_size: 4,
      right_size: 4,
    },
  },
  {
    type: "source_port",
    name: "GND",
    source_port_id: "source_port_0",
    source_component_id: "simple_bug_0",
    pin_number: 1,
    port_hints: ["GND", "1"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_0",
    source_port_id: "source_port_0",
    center: {
      x: -0.75,
      y: 0.75,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_0",
    schematic_text_id: "schematic_text_8",
    text: "1",
    anchor: "center",
    rotation: 0,
    position: {
      x: -0.6262563132923542,
      y: 0.6262563132923542,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: 4.578192982456141,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "VBUS",
    source_port_id: "source_port_1",
    source_component_id: "simple_bug_0",
    pin_number: 2,
    port_hints: ["VBUS", "2"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    source_port_id: "source_port_1",
    center: {
      x: -0.75,
      y: 0.25,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_1",
    schematic_text_id: "schematic_text_9",
    text: "2",
    anchor: "center",
    rotation: 0,
    position: {
      x: -0.6262563132923542,
      y: 0.12625631329235418,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: 3.308192982456141,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "D-",
    source_port_id: "source_port_2",
    source_component_id: "simple_bug_0",
    pin_number: 3,
    port_hints: ["D-", "3"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_2",
    source_port_id: "source_port_2",
    center: {
      x: -0.75,
      y: -0.25,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_2",
    schematic_text_id: "schematic_text_10",
    text: "3",
    anchor: "center",
    rotation: 0,
    position: {
      x: -0.6262563132923542,
      y: -0.3737436867076458,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: 2.038192982456141,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "D+",
    source_port_id: "source_port_3",
    source_component_id: "simple_bug_0",
    pin_number: 4,
    port_hints: ["D+", "4"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_3",
    source_port_id: "source_port_3",
    center: {
      x: -0.75,
      y: -0.75,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_3",
    schematic_text_id: "schematic_text_11",
    text: "4",
    anchor: "center",
    rotation: 0,
    position: {
      x: -0.6262563132923542,
      y: -0.8737436867076458,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_3",
    source_port_id: "source_port_3",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: 0.7681929824561409,
    layers: ["top"],
  },
  {
    type: "source_port",
    source_port_id: "source_port_4",
    source_component_id: "simple_bug_0",
    pin_number: 5,
    port_hints: ["5"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_4",
    source_port_id: "source_port_4",
    center: {
      x: 0.75,
      y: -0.75,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_4",
    schematic_text_id: "schematic_text_12",
    text: "5",
    anchor: "center",
    rotation: 0,
    position: {
      x: 0.6262563132923542,
      y: -0.8737436867076458,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_4",
    source_port_id: "source_port_4",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: -0.5018070175438591,
    layers: ["top"],
  },
  {
    type: "source_port",
    source_port_id: "source_port_5",
    source_component_id: "simple_bug_0",
    pin_number: 6,
    port_hints: ["6"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_5",
    source_port_id: "source_port_5",
    center: {
      x: 0.75,
      y: -0.25,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_5",
    schematic_text_id: "schematic_text_13",
    text: "6",
    anchor: "center",
    rotation: 0,
    position: {
      x: 0.6262563132923542,
      y: -0.3737436867076458,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_5",
    source_port_id: "source_port_5",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: -1.7718070175438587,
    layers: ["top"],
  },
  {
    type: "source_port",
    source_port_id: "source_port_6",
    source_component_id: "simple_bug_0",
    pin_number: 7,
    port_hints: ["7"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_6",
    source_port_id: "source_port_6",
    center: {
      x: 0.75,
      y: 0.25,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_6",
    schematic_text_id: "schematic_text_14",
    text: "7",
    anchor: "center",
    rotation: 0,
    position: {
      x: 0.6262563132923542,
      y: 0.12625631329235418,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_6",
    source_port_id: "source_port_6",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: -3.041807017543859,
    layers: ["top"],
  },
  {
    type: "source_port",
    source_port_id: "source_port_7",
    source_component_id: "simple_bug_0",
    pin_number: 8,
    port_hints: ["8"],
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_7",
    source_port_id: "source_port_7",
    center: {
      x: 0.75,
      y: 0.75,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "schematic_text",
    schematic_port_id: "schematic_port_7",
    schematic_text_id: "schematic_text_15",
    text: "8",
    anchor: "center",
    rotation: 0,
    position: {
      x: 0.6262563132923542,
      y: 0.6262563132923542,
    },
    schematic_component_id: "schematic_component_simple_bug_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_7",
    source_port_id: "source_port_7",
    pcb_component_id: "pcb_component_simple_bug_0",
    x: -6.4542506265664175,
    y: -4.31180701754386,
    layers: ["top"],
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_0",
    schematic_component_id: "schematic_component_simple_bug_0",
    text: "GND",
    anchor: "left",
    rotation: 0,
    position: {
      x: -0.35,
      y: 0.75,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_1",
    schematic_component_id: "schematic_component_simple_bug_0",
    text: "VBUS",
    anchor: "left",
    rotation: 0,
    position: {
      x: -0.35,
      y: 0.25,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_2",
    schematic_component_id: "schematic_component_simple_bug_0",
    text: "D-",
    anchor: "left",
    rotation: 0,
    position: {
      x: -0.35,
      y: -0.25,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_3",
    schematic_component_id: "schematic_component_simple_bug_0",
    text: "D+",
    anchor: "left",
    rotation: 0,
    position: {
      x: -0.35,
      y: -0.75,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_4",
    schematic_component_id: "schematic_component_simple_bug_0",
    anchor: "right",
    rotation: 0,
    position: {
      x: 0.35,
      y: -0.75,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_5",
    schematic_component_id: "schematic_component_simple_bug_0",
    anchor: "right",
    rotation: 0,
    position: {
      x: 0.35,
      y: -0.25,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_6",
    schematic_component_id: "schematic_component_simple_bug_0",
    anchor: "right",
    rotation: 0,
    position: {
      x: 0.35,
      y: 0.25,
    },
  },
  {
    type: "schematic_text",
    schematic_text_id: "schematic_text_7",
    schematic_component_id: "schematic_component_simple_bug_0",
    anchor: "right",
    rotation: 0,
    position: {
      x: 0.35,
      y: 0.75,
    },
  },
  {
    type: "pcb_component",
    source_component_id: "simple_bug_0",
    pcb_component_id: "pcb_component_simple_bug_0",
    layer: "top",
    center: {
      x: -5.004250626566417,
      y: 0.13319298245614064,
    },
    rotation: 0,
    width: 3.9,
    height: 9.49,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rect",
    x: -6.4542506265664175,
    y: 4.578192982456141,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["1"],
    pcb_port_id: "pcb_port_0",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    shape: "rect",
    x: -6.4542506265664175,
    y: 3.308192982456141,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["2"],
    pcb_port_id: "pcb_port_1",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_4",
    shape: "rect",
    x: -6.4542506265664175,
    y: 2.038192982456141,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["3"],
    pcb_port_id: "pcb_port_2",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_5",
    shape: "rect",
    x: -6.4542506265664175,
    y: 0.7681929824561409,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["4"],
    pcb_port_id: "pcb_port_3",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_6",
    shape: "rect",
    x: -6.4542506265664175,
    y: -0.5018070175438591,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["5"],
    pcb_port_id: "pcb_port_4",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_7",
    shape: "rect",
    x: -6.4542506265664175,
    y: -1.7718070175438587,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["6"],
    pcb_port_id: "pcb_port_5",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_8",
    shape: "rect",
    x: -6.4542506265664175,
    y: -3.041807017543859,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["7"],
    pcb_port_id: "pcb_port_6",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_9",
    shape: "rect",
    x: -6.4542506265664175,
    y: -4.31180701754386,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["8"],
    pcb_port_id: "pcb_port_7",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_10",
    shape: "rect",
    x: -3.554250626566417,
    y: -4.31180701754386,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["9"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_11",
    shape: "rect",
    x: -3.554250626566417,
    y: -3.0418070175438596,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["10"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_12",
    shape: "rect",
    x: -3.554250626566417,
    y: -1.7718070175438596,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["11"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_13",
    shape: "rect",
    x: -3.554250626566417,
    y: -0.5018070175438596,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["12"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_14",
    shape: "rect",
    x: -3.554250626566417,
    y: 0.7681929824561404,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["13"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_15",
    shape: "rect",
    x: -3.554250626566417,
    y: 2.03819298245614,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["14"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_16",
    shape: "rect",
    x: -3.554250626566417,
    y: 3.3081929824561405,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["15"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_17",
    shape: "rect",
    x: -3.554250626566417,
    y: 4.578192982456141,
    width: 1,
    height: 0.6,
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    port_hints: ["16"],
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_component_simple_bug_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
    route: [
      {
        x: -5.854250626566417,
        y: -4.6118070175438595,
      },
      {
        x: -5.854250626566417,
        y: 4.878192982456141,
      },
      {
        x: -5.2875839598997505,
        y: 4.878192982456141,
      },
      {
        x: -5.266016494111282,
        y: 4.769766009952699,
      },
      {
        x: -5.204597547902606,
        y: 4.677846061119952,
      },
      {
        x: -5.112677599069859,
        y: 4.616427114911276,
      },
      {
        x: -5.004250626566417,
        y: 4.5948596491228075,
      },
      {
        x: -4.895823654062975,
        y: 4.616427114911276,
      },
      {
        x: -4.803903705230229,
        y: 4.677846061119952,
      },
      {
        x: -4.742484759021552,
        y: 4.769766009952699,
      },
      {
        x: -4.720917293233084,
        y: 4.878192982456141,
      },
      {
        x: -4.154250626566418,
        y: 4.878192982456141,
      },
      {
        x: -4.154250626566418,
        y: -4.6118070175438595,
      },
      {
        x: -5.854250626566417,
        y: -4.6118070175438595,
      },
    ],
    stroke_width: 0.1,
  },
  {
    type: "source_component",
    source_component_id: "simple_resistor_0",
    name: "R1",
    supplier_part_numbers: {},
    ftype: "simple_resistor",
    resistance: "10kohm",
  },
  {
    type: "schematic_component",
    source_component_id: "simple_resistor_0",
    schematic_component_id: "schematic_component_simple_resistor_0",
    rotation: 0,
    size: {
      width: 1.18,
      height: 1.3,
    },
    center: {
      x: -2.1,
      y: 0,
    },
    symbol_name: "boxresistor_right",
  },
  {
    type: "source_port",
    name: "left",
    source_port_id: "source_port_8",
    source_component_id: "simple_resistor_0",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_8",
    source_port_id: "source_port_8",
    center: {
      x: -2.625,
      y: 0,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_resistor_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_8",
    source_port_id: "source_port_8",
    pcb_component_id: "pcb_component_simple_resistor_0",
    x: 1.8851077694235585,
    y: 0,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "right",
    source_port_id: "source_port_9",
    source_component_id: "simple_resistor_0",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_9",
    source_port_id: "source_port_9",
    center: {
      x: -1.625,
      y: 0,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_resistor_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_9",
    source_port_id: "source_port_9",
    pcb_component_id: "pcb_component_simple_resistor_0",
    x: 3.7851077694235586,
    y: 0,
    layers: ["top"],
  },
  {
    type: "schematic_text",
    text: "R1",
    schematic_text_id: "schematic_text_16",
    schematic_component_id: "schematic_component_simple_resistor_0",
    anchor: "left",
    position: {
      x: -2.325,
      y: -0.5,
    },
    rotation: 0,
  },
  {
    type: "schematic_text",
    text: "10kohm",
    schematic_text_id: "schematic_text_17",
    schematic_component_id: "schematic_component_simple_resistor_0",
    anchor: "left",
    position: {
      x: -2.325,
      y: -0.3,
    },
    rotation: 0,
  },
  {
    type: "pcb_component",
    source_component_id: "simple_resistor_0",
    pcb_component_id: "pcb_component_simple_resistor_0",
    layer: "top",
    center: {
      x: 2.8351077694235585,
      y: 0,
    },
    rotation: 0,
    width: 3.0999999999999996,
    height: 1.2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "rect",
    x: 1.8851077694235585,
    y: 0,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["1", "left"],
    pcb_port_id: "pcb_port_8",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_3",
    shape: "rect",
    x: 3.7851077694235586,
    y: 0,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["2", "right"],
    pcb_port_id: "pcb_port_9",
  },
  {
    pcb_error_id: "pcb_error_0",
    type: "pcb_error",
    message: 'No elements found for selector: ".C1"',
    error_type: "pcb_placement_error",
  },
  {
    pcb_error_id: "pcb_error_1",
    type: "pcb_error",
    message: 'No elements found for selector: ".R2"',
    error_type: "pcb_placement_error",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: ["source_port_0", "source_port_8"],
    connected_source_net_ids: [],
  },
  {
    type: "schematic_trace",
    source_trace_id: "source_trace_0",
    schematic_trace_id: "schematic_trace_0",
    edges: [
      {
        from: {
          x: -0.8999999999999999,
          y: 0.8,
        },
        to: {
          x: -0.8999999999999999,
          y: 0.6000000000000001,
        },
      },
      {
        from: {
          x: -0.8999999999999999,
          y: 0.6000000000000001,
        },
        to: {
          x: -2.7,
          y: 0.6000000000000001,
        },
      },
      {
        from: {
          x: -2.7,
          y: 0.6000000000000001,
        },
        to: {
          x: -2.7,
          y: 0,
        },
      },
      {
        from: {
          x: -2.7,
          y: 0,
        },
        to: {
          x: -2.8000000000000003,
          y: 0,
        },
      },
      {
        from: {
          x: -0.75,
          y: 0.75,
          ti: 0,
        },
        to: {
          x: -0.8999999999999999,
          y: 0.8,
        },
      },
      {
        from: {
          x: -2.625,
          y: 0,
          ti: 1,
        },
        to: {
          x: -2.8000000000000003,
          y: 0,
        },
      },
    ],
    from_schematic_port_id: "schematic_port_8",
    to_schematic_port_id: "schematic_port_0",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
    route: [
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: 1.9,
        y: 0,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: 1.4,
        y: 0,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: 1.4000000000000004,
        y: 0,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: 0.40000000000000036,
        y: 1,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -0.40000000000000036,
        y: 1,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -0.7999999999999998,
        y: 1.4000000000000004,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -1.2000000000000002,
        y: 1.4000000000000004,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -1.4000000000000004,
        y: 1.6,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -2.2,
        y: 1.6,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -3,
        y: 2.4000000000000004,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -3.2,
        y: 2.4000000000000004,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -3.5999999999999996,
        y: 2.8000000000000007,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -4.4,
        y: 2.8000000000000007,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6,
        y: 4.4,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6.2,
        y: 4.4,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6.199999999999999,
        y: 4.4,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6.3,
        y: 4.5,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6.4,
        y: 4.5,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.05,
        x: -6.5,
        y: 4.6000000000000005,
      },
    ],
  },
  {
    type: "pcb_board",
    center: {
      x: 0,
      y: 0,
    },
    width: 20,
    height: 20,
  },
]

export const NetLabelNotOverlap = () => {
  const result = convertCircuitJsonToPcbSvg(soup)

  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Net Label Not Overlap",
  component: NetLabelNotOverlap,
}
