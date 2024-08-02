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
npm install @tscircuit/circuit-to-svg
```

## Usage

```typescript
import { soupToSvg, pcbSoupToSvg } from '@tscircuit/circuit-to-svg';

// For schematic circuits
const schematicSoup = [...]; // Your schematic circuit description
const schematicSvg = soupToSvg(schematicSoup);

// For PCB layouts
const pcbSoup = [...]; // Your PCB layout description
const pcbSvg = pcbSoupToSvg(pcbSoup);
```

## API

### `soupToSvg(soup: AnySoupElement[]): string`

Converts a schematic circuit description to an SVG string.

### `pcbSoupToSvg(soup: AnySoupElement[]): string`

Converts a PCB layout description to an SVG string.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
