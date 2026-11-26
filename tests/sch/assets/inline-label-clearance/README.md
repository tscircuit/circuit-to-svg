# TI inline label clearance references

These are complete schematic conversions of the original Texas Instruments
Altium documents implicated by the review of
[altium-to-circuit-json #248](https://github.com/tscircuit/altium-to-circuit-json/pull/248).
No source settings, label positions, wire geometry, fonts, or orientations were
changed for the board fixtures or their full-page/detail snapshots.

Generated with `convertAltiumToCircuitJson(bytes, { sourceType: "schematic" })`
from importer commit `3f306a4ec2655be043ae12b7ccfa2465ec323607`. This preserves
the original attachment points and expresses text placement using anchors.
The separate orientation/font unit cases in the test are synthetic variations;
they are not used for the board snapshots.

| Fixture | Original TI source | Records | Source document SHA-256 |
| --- | --- | --- | --- |
| `ti-drv8307evm.json.gz` | [SLVC565A](https://www.ti.com/lit/zip/slvc565a), `Board files/DRV8307EVM RevA.SchDoc` | 1,740 | `478b7e0d88ea8419da186388e57acb13fcfbee0bc5b9be253b7192e75d79fd07` |
| `ti-tmds62levm-sheet55.json.gz` | [SPRCAL9 Rev. B](https://www.ti.com/lit/zip/sprcal9), sheet `55.SchDoc` in the nested `PROC181E1-1_PRJPCB.zip` | 622 | `5d1e475cf86dde5d9e62f87becb64717b15012e824929448ed525bce925c9698` |

The importer downloads and verifies these documents with
`bun run download-references`. Its files are
`tests/fixtures/downloaded/ti-drv8307evm.SchDoc` and
`tests/fixtures/downloaded/ti-tmds62levm-rev-b/55.SchDoc`.
Serialize the complete conversion output with `JSON.stringify(circuitJson, null, 2)`
and gzip it. Compression keeps the complete board geometry without a large JSON diff.
Detail snapshots only change the SVG viewport; they use the same full schematic
and preserve all underlying Circuit JSON coordinates.

The isolated glyph-clearance measurements load the included, unmodified
`NotoSans-Regular.ttf` with system-font loading disabled. This makes their pixel
measurements consistent across developer machines and CI. The font is distributed
under the included `OFL.txt`; it does not change the board fixtures or their SVG
font declarations.
