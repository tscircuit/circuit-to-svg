import type { PcbSoldermaskOpening, PcbTrace } from "circuit-json"
import { type AnyCircuitElement, Circuit } from "tscircuit"
import { silkText } from "./standalone-soldermask-openings"

const openings: PcbSoldermaskOpening[] = (["top", "bottom"] as const).map(
  (layer) => ({
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: `${layer}-via-opening`,
    shape: "rect",
    layer,
    x: 0,
    y: -0.2,
    width: 4,
    height: 3.6,
  }),
)

const blindTrace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "top-blind-trace",
  route: [
    { route_type: "wire", x: -3.4, y: 0.5, width: 0.35, layer: "top" },
    { route_type: "wire", x: -1, y: 0.5, width: 0.35, layer: "top" },
    {
      route_type: "via",
      x: -1,
      y: 0.5,
      from_layer: "top",
      to_layer: "inner1",
    },
    { route_type: "wire", x: -1, y: 0.5, width: 0.35, layer: "inner1" },
    { route_type: "wire", x: -3.4, y: 0.5, width: 0.35, layer: "inner1" },
  ],
}

const labels = (["top", "bottom"] as const).flatMap((layer) => [
  silkText(
    `${layer}-heading`,
    layer === "top"
      ? "TOP: MASK OPENING OVER VIAS & PAD"
      : "BOTTOM VIEW: MASK OPENING OVER VIAS & PAD",
    0,
    4.8,
    layer,
    0.36,
  ),
  silkText(
    `${layer}-sub`,
    "Red = top copper, blue = bottom copper, tan = substrate, pink = drill",
    0,
    4.1,
    layer,
    0.24,
  ),
  silkText(
    `${layer}-blind-label`,
    layer === "top" ? "TOP->INNER1 BLIND VIA" : "NO TOP BLIND VIA",
    -1.2,
    2.3,
    layer,
    0.23,
  ),
  silkText(
    `${layer}-edge-via-label`,
    "TENTED VIA AT EDGE",
    2.1,
    2.3,
    layer,
    0.23,
  ),
  silkText(`${layer}-pad-label`, "MASKED PAD (PIN 1)", -2, -2.6, layer, 0.23),
])

export async function createViaOpeningCircuit(): Promise<AnyCircuitElement[]> {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(
    <board
      width={12}
      height={11}
      layers={4}
      routingDisabled
      defaultViaTenting="top_and_bottom_tented"
    >
      <via
        pcbX={2}
        pcbY={0.5}
        outerDiameter="1.6mm"
        holeDiameter="0.6mm"
        fromLayer="top"
        toLayer="bottom"
      />
      <chip
        name="U1"
        pcbX={-2}
        pcbY={-1}
        layer="top"
        footprint={
          <footprint>
            <smtpad
              shape="rect"
              width="1.6mm"
              height="1.2mm"
              portHints={["pin1"]}
              pcbX={0}
              pcbY={0}
              coveredWithSolderMask
            />
          </footprint>
        }
      />
      <chip
        name="U2"
        pcbX={-2}
        pcbY={-1}
        layer="bottom"
        footprint={
          <footprint>
            <smtpad
              shape="rect"
              width="1.6mm"
              height="1.2mm"
              portHints={["pin1"]}
              pcbX={0}
              pcbY={0}
              coveredWithSolderMask
            />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return [...circuit.getCircuitJson(), blindTrace, ...openings, ...labels]
}

export const viaOpeningOptions = {
  width: 720,
  height: 660,
  viewport: { minX: -6, minY: -5.5, maxX: 6, maxY: 5.5 },
  showSolderMask: true,
  showPinNumbers: true,
  colorOverrides: {
    copper: { top: "#ff0000", bottom: "#0000ff" },
    substrate: "#c9a26e",
    drill: "#ff00ff",
  },
}
