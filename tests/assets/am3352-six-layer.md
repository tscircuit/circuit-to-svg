The gzip fixture contains the complete, unmodified Circuit JSON downloaded from:
https://am3352-six-layer-routing-proof.seveibar.chatgpt.site/am3352/circuit.json.gz

SHA-256 of decompressed JSON:
`102347c87209faf6600229e7a5ec533b5eb90839cd904629457bd9a61e1dab02`

`am3352-isolated-pour-warnings.json` is the output of `checkCopperPourIslands`
from tscircuit/checks PR #488 on that full board: 254 pour warnings, including
141 GND warnings (105 inner1, 17 bottom, 19 inner4). The tests retain all original
geometry and replace unrelated pre-existing warning records for rendering.
