# circuit-to-svg

A TypeScript library for converting Circuit JSON to Schematic, PCB and Assembly SVG representations.

![](https://api.tscircuit.com/packages/images/seveibar/keyboard-default60/pcb.svg?fs_sha=md5-e4fc4758380cab0efcc1b3b12bdcf36d)

![](https://api.tscircuit.com/packages/images/seveibar/usb-c-flashlight/schematic.svg?fs_sha=)

```bash
npm add circuit-to-svg
# or...
bun add circuit-to-svg
```

## Overview

This library provides functionality to convert Circuit JSON into SVG (Scalable Vector Graphics) representations. It supports both schematic and PCB (Printed Circuit Board), and Assembly layouts.

## Features

- Convert schematic circuit descriptions to SVG
- Convert PCB layouts to SVG
- Support for various circuit elements:
  - Components
  - Traces
  - Text labels
  - Net labels
  - PCB boards
  - PCB components
  - PCB traces
  - PCB holes and pads

## Installation

```bash
npm install circuit-to-svg
```

## Usage

```typescript
import { convertCircuitJsonToSchematicSvg, convertCircuitJsonToPcbSvg } from 'circuit-to-svg';

// For schematic circuits
const schematicCircuitJson = [...]; // Your schematic circuit description
const schematicSvg = convertCircuitJsonToSchematicSvg(schematicCircuitJson);

// For PCB layouts
const pcbCircuitJson = [...]; // Your PCB layout description
const pcbSvg = convertCircuitJsonToPcbSvg(pcbCircuitJson);
```

## API

### `convertCircuitJsonToSchematicSvg(circuitJson: AnyCircuitElement[]): string`

Converts a schematic circuit description to an SVG string.

### `convertCircuitJsonToPcbSvg(circuitJson: AnyCircuitElement[]): string`

Converts a PCB layout description to an SVG string.

#### Options

- `width` and `height` – dimensions of the output SVG. Defaults to `800x600`.
- `matchBoardAspectRatio` – if `true`, adjust the SVG dimensions so the
  resulting aspect ratio matches the `pcb_board` found in the circuit JSON.
- `backgroundColor` – fill color for the SVG background rectangle. Defaults to
  `"#000"`.
- `drawPaddingOutsideBoard` – if `false`, omit the board outline and extra
  padding around it. Defaults to `true`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
