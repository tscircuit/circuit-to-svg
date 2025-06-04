# circuit-to-svg

A TypeScript library for converting circuit descriptions (soup) to SVG representations.

## Overview

This library provides functionality to convert circuit descriptions, referred to as "soup", into SVG (Scalable Vector Graphics) representations. It supports both schematic and PCB (Printed Circuit Board) layouts.

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
