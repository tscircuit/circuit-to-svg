# LoRa device U1 assembly reproduction

Source: [gokul/lora-device](https://tscircuit.com/gokul/lora-device),
version 0.1.6, `dist/index/circuit.json`.
This extract is contributed by the board owner for this reproduction.

The fixture retains U1 (ESP32-S3-WROOM-1-N8), all 49 source ports,
49 placed PCB ports, and 49 SMT pads in their original order. Coordinates,
pad sizes, component bounds, and the 180-degree top-layer rotation are unchanged.
Unrelated components, traces, schematic/3D data, and references to omitted
groups/connectivity maps are removed. Only the board bounds are cropped to
24 x 24 mm around U1 to make the snapshots readable.

U1 is centered at (-12, -21.5) mm. Its first PCB port references source pin 1
at approximately (-3.100221, -30.604643) mm: bottom-right in the top view.
The PCB snapshot enables pad numbers to identify this position. The current
assembly snapshot instead places the black triangle at top-left.
This is a rotation reproduction; pin 1 is already the first port in the input.

Run from the repository root:

```sh
bun test tests/assembly/assembly-lora-device-pin1-rotation.test.ts
```
