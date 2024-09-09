import { expect, test } from "bun:test";
import { circuitJsonToPcbSvg } from "src";

const pcbData: any[] = [
    {
      "type": "source_port",
      "source_port_id": "source_port_0",
      "name": "pin1",
      "pin_number": 1,
      "port_hints": [
        "pin1",
        "1"
      ],
      "source_component_id": "source_component_0"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_1",
      "name": "pin2",
      "pin_number": 2,
      "port_hints": [
        "pin2",
        "2"
      ],
      "source_component_id": "source_component_0"
    },
    {
      "type": "source_component",
      "source_component_id": "source_component_0",
      "ftype": "simple_chip",
      "name": "S1"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_2",
      "name": "pin1",
      "pin_number": 1,
      "port_hints": [
        "pin1",
        "1"
      ],
      "source_component_id": "source_component_1"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_3",
      "name": "pin2",
      "pin_number": 2,
      "port_hints": [
        "pin2",
        "2"
      ],
      "source_component_id": "source_component_1"
    },
    {
      "type": "source_component",
      "source_component_id": "source_component_1",
      "ftype": "simple_chip",
      "name": "S2"
    },
    {
      "type": "schematic_component",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": 0,
        "y": 0
      },
      "rotation": 0,
      "size": {
        "width": 0.4,
        "height": 0.4
      },
      "pin_spacing": 0.2,
      "source_component_id": "source_component_0"
    },
    {
      "type": "schematic_component",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": 0,
        "y": 0
      },
      "rotation": 0,
      "size": {
        "width": 0.4,
        "height": 0.4
      },
      "pin_spacing": 0.2,
      "source_component_id": "source_component_1"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_0",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": 0,
        "y": 0
      },
      "source_port_id": "source_port_0",
      "facing_direction": "up"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_1",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": 0,
        "y": 0
      },
      "source_port_id": "source_port_1",
      "facing_direction": "up"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_2",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": 0,
        "y": 0
      },
      "source_port_id": "source_port_2",
      "facing_direction": "up"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_3",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": 0,
        "y": 0
      },
      "source_port_id": "source_port_3",
      "facing_direction": "up"
    },
    {
      "type": "pcb_component",
      "pcb_component_id": "pcb_component_0",
      "center": {
        "x": 0,
        "y": 2
      },
      "width": null,
      "height": null,
      "layer": "top",
      "rotation": 0,
      "source_component_id": "source_component_0"
    },
    {
      "type": "pcb_component",
      "pcb_component_id": "pcb_component_1",
      "center": {
        "x": 0,
        "y": -8
      },
      "width": null,
      "height": null,
      "layer": "top",
      "rotation": 0,
      "source_component_id": "source_component_1"
    },
    {
      "type": "pcb_board",
      "pcb_board_id": "pcb_board_0",
      "center": {
        "x": 0,
        "y": -3
      },
      "width": 18,
      "height": 16
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_0",
      "pcb_component_id": null,
      "pcb_port_id": null,
      "layer": "top",
      "shape": "rect",
      "width": 2.55,
      "height": 2.5,
      "port_hints": [
        "pin1"
      ],
      "x": -6.925,
      "y": 3.27
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_1",
      "pcb_component_id": null,
      "pcb_port_id": null,
      "layer": "top",
      "shape": "rect",
      "width": 2.55,
      "height": 2.5,
      "port_hints": [
        "pin2"
      ],
      "x": 6.925,
      "y": 0.73
    },
    {
      "type": "pcb_plated_hole",
      "pcb_plated_hole_id": "pcb_plated_hole_0",
      "pcb_component_id": null,
      "outer_diameter": 3.1,
      "hole_diameter": 3,
      "shape": "circle",
      "port_hints": [
        "H1"
      ],
      "x": -3.125,
      "y": 3.27,
      "layers": [
        "top",
        "bottom"
      ]
    },
    {
      "type": "pcb_plated_hole",
      "pcb_plated_hole_id": "pcb_plated_hole_1",
      "pcb_component_id": null,
      "outer_diameter": 3.1,
      "hole_diameter": 3,
      "shape": "circle",
      "port_hints": [
        "H2"
      ],
      "x": 3.225,
      "y": 0.73,
      "layers": [
        "top",
        "bottom"
      ]
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_2",
      "pcb_component_id": null,
      "pcb_port_id": null,
      "layer": "top",
      "shape": "rect",
      "width": 2.55,
      "height": 2.5,
      "port_hints": [
        "pin1"
      ],
      "x": -6.925,
      "y": -6.73
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_3",
      "pcb_component_id": null,
      "pcb_port_id": null,
      "layer": "top",
      "shape": "rect",
      "width": 2.55,
      "height": 2.5,
      "port_hints": [
        "pin2"
      ],
      "x": 6.925,
      "y": -9.27
    },
    {
      "type": "pcb_plated_hole",
      "pcb_plated_hole_id": "pcb_plated_hole_2",
      "pcb_component_id": null,
      "outer_diameter": 3.1,
      "hole_diameter": 3,
      "shape": "circle",
      "port_hints": [
        "H1"
      ],
      "x": -3.125,
      "y": -6.73,
      "layers": [
        "top",
        "bottom"
      ]
    },
    {
      "type": "pcb_plated_hole",
      "pcb_plated_hole_id": "pcb_plated_hole_3",
      "pcb_component_id": null,
      "outer_diameter": 3.1,
      "hole_diameter": 3,
      "shape": "circle",
      "port_hints": [
        "H2"
      ],
      "x": 3.225,
      "y": -9.27,
      "layers": [
        "top",
        "bottom"
      ]
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_0",
      "pcb_component_id": "pcb_component_0",
      "layers": [
        "top"
      ],
      "x": -6.925,
      "y": 3.27,
      "source_port_id": "source_port_0"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_1",
      "pcb_component_id": "pcb_component_0",
      "layers": [
        "top"
      ],
      "x": 6.925,
      "y": 0.73,
      "source_port_id": "source_port_1"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_2",
      "pcb_component_id": "pcb_component_1",
      "layers": [
        "top"
      ],
      "x": -6.925,
      "y": -6.73,
      "source_port_id": "source_port_2"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_3",
      "pcb_component_id": "pcb_component_1",
      "layers": [
        "top"
      ],
      "x": 6.925,
      "y": -9.27,
      "source_port_id": "source_port_3"
    }
  ]

test("pcbData", () => {
  expect(circuitJsonToPcbSvg(pcbData)).toMatchSvgSnapshot(import.meta.path, {
    updateSnapshot: true,
  });
});
