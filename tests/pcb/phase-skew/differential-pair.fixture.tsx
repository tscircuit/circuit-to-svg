import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg, type PcbSvgOptions } from "lib"
import type { SvgObject } from "lib/svg-object"
import { Fragment, type ComponentProps } from "react"

type PcbPath = NonNullable<ComponentProps<"trace">["pcbPath"]>

export const TUNING_BUMP: PcbPath = [
  { x: 3, y: 0 },
  { x: 3.9, y: 0.9 },
  { x: 4.7, y: 0.9 },
  { x: 5.6, y: 0 },
]

export const LAYER_CHANGE: PcbPath = [
  { x: 12, y: 0, via: true, toLayer: "bottom" },
]

export const PHASE_SKEW_SVG_SIZE = { width: 800, height: 260 }

export function renderPhaseSkewSvg(
  circuitJson: CircuitJson,
  options?: PcbSvgOptions,
): string {
  return convertCircuitJsonToPcbSvg(circuitJson, {
    ...PHASE_SKEW_SVG_SIZE,
    showDifferentialPairPhaseSkew: true,
    ...options,
  })
}

/** Render the matched pair or add waypoints to either trace. */
export async function renderDifferentialPair({
  positivePath = [],
  negativePath = [],
  loadLayer = "top",
  maxLengthSkew,
}: {
  positivePath?: PcbPath
  negativePath?: PcbPath
  loadLayer?: "top" | "bottom"
  maxLengthSkew?: number
}): Promise<CircuitJson> {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  const legs = [
    { name: "P", y: 0.6, path: positivePath },
    { name: "N", y: -0.6, path: negativePath },
  ]
  circuit.add(
    <board width={28} height={8} routeRemaining={false}>
      {legs.map(({ name, y, path }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={0.65}
            doNotPlace
            pcbX={-12}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={0.65}
            doNotPlace
            pcbX={12}
            pcbY={y}
            layer={loadLayer}
          />
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness="0.24mm"
            pcbPath={path}
          />
        </Fragment>
      ))}
      <differentialpair
        name="PAIR"
        positiveConnection="P"
        negativeConnection="N"
        pcbTraceGap="0.96mm"
        maxLengthSkew={maxLengthSkew}
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit
    .getCircuitJson()
    .filter(
      (element) =>
        element.type !== "pcb_silkscreen_text" || !element.pcb_component_id,
    )
}

/** Identify the overlay strokes among the rendered PCB objects. */
export function isPhaseSkewStroke({ attributes }: SvgObject): boolean {
  return attributes["data-type"] === "pcb_differential_pair_phase_skew"
}
