# circuit-to-svg

A TypeScript library for converting Circuit JSON to Schematic, PCB and Assembly SVG representations.

[Getting Started Contributor Video](https://share.cleanshot.com/6zXbLGF7)

<div align="center">
  <img src="https://api.tscircuit.com/packages/images/seveibar/led-water-accelerometer/pcb.svg" alt="PCB" height="200" />
  <img src="https://api.tscircuit.com/packages/images/seveibar/led-water-accelerometer/schematic.svg" alt="Schematic" height="200" />
</div>

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
import { readFileSync, writeFileSync } from 'fs'
import {
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToPcbSvg,
} from 'circuit-to-svg'

const circuitJson = JSON.parse(readFileSync('circuit.json', 'utf8'))

// Generate a schematic with a grid
const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
  width: 1000,
  height: 600,
  grid: true,
})

// Generate a PCB image using the board's aspect ratio
const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
  matchBoardAspectRatio: true,
  backgroundColor: '#1e1e1e',
})

writeFileSync('board.svg', pcbSvg)
```

## API

### convertCircuitJsonToSchematicSvg

`convertCircuitJsonToSchematicSvg(circuitJson: AnyCircuitElement[], options?): string`

Converts a schematic circuit description to an SVG string.

#### Options

- `includeVersion` – if `true`, add a `data-circuit-to-svg-version` attribute to
  the root `<svg>`.

### convertCircuitJsonToPcbSvg

`convertCircuitJsonToPcbSvg(circuitJson: AnyCircuitElement[], options?): string`

Converts a PCB layout description to an SVG string.

#### Options

- `width` and `height` – dimensions of the output SVG. Defaults to `800x600`.
- `matchBoardAspectRatio` – if `true`, adjust the SVG dimensions so the
  resulting aspect ratio matches the `pcb_board` found in the circuit JSON.
- `backgroundColor` – fill color for the SVG background rectangle. Defaults to
  `"#000"`.
- `drawPaddingOutsideBoard` – if `false`, omit the board outline and extra
  padding around it. Defaults to `true`.
- `includeVersion` – if `true`, add a `data-circuit-to-svg-version` attribute to
  the root `<svg>`.

### convertCircuitJsonToAssemblySvg

`convertCircuitJsonToAssemblySvg(circuitJson: AnyCircuitElement[], options?): string`

Converts circuit JSON into an assembly view of the board and components.

#### Options

- `width` and `height` – dimensions of the output SVG. Defaults to `800x600`.
- `includeVersion` – if `true`, add a `data-circuit-to-svg-version` attribute to
  the root `<svg>`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
