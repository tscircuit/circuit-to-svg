import type { PcbPath } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import { Fragment, type ReactElement } from "react"
import { Circuit } from "tscircuit-phase-skew-fixtures"

function Pair({
  name,
  y = 0,
  positivePath = [],
  negativePath = [],
  loadLayer = "top",
  padDiameter = 0.65,
}: {
  name: string
  y?: number
  positivePath?: PcbPath
  negativePath?: PcbPath | null
  loadLayer?: "top" | "bottom"
  padDiameter?: number
}): ReactElement {
  const legs = [
    { name: `${name}_P`, y: y + 0.6, path: positivePath },
    { name: `${name}_N`, y: y - 0.6, path: negativePath },
  ]
  return (
    <>
      {legs.map(({ name, y, path }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={padDiameter}
            doNotPlace
            pcbX={-12}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={padDiameter}
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
            pcbPath={path ?? undefined}
          />
        </Fragment>
      ))}
      <differentialpair
        name={name}
        positiveConnection={`${name}_P`}
        negativeConnection={`${name}_N`}
        pcbTraceGap="0.96mm"
      />
    </>
  )
}

/** A 45° detour measured from the source pad, with its height signed by direction. */
function detour(x: number, height: number): PcbPath {
  const run = Math.abs(height)
  return [
    { x, y: 0 },
    { x: x + run, y: height },
    { x: x + run + 0.8, y: height },
    { x: x + 2 * run + 0.8, y: 0 },
  ]
}

export function renderBoard(board: ReactElement): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(board)
  const circuitJson = circuit.getCircuitJson() as CircuitJson
  // Keep the board's comparison labels and hide generated test point names.
  return circuitJson.filter(
    (element) =>
      element.type !== "pcb_silkscreen_text" || !element.pcb_component_id,
  )
}

export function MatchedPairBoard(): ReactElement {
  return (
    <board width={28} height={8} routeRemaining={false}>
      <Pair name="MATCHED" />
    </board>
  )
}

export function LoadEndMeanderBoard(): ReactElement {
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="MEANDER"
        positivePath={detour(2, 2.2)}
        negativePath={[...detour(16, -1.1), ...detour(20, -1.1)]}
      />
    </board>
  )
}

export function LocalCompensationBoard(): ReactElement {
  return (
    <board width={28} height={11} routeRemaining={false}>
      <Pair
        name="COMPENSATED"
        y={2.2}
        positivePath={detour(3, 0.9)}
        negativePath={detour(6, -0.9)}
      />
      <silkscreentext text="COMPENSATED" pcbX={5} pcbY={3.8} fontSize={0.7} />
      <Pair name="UNCOMPENSATED" y={-2.2} positivePath={detour(3, 0.9)} />
      <silkscreentext
        text="UNCOMPENSATED"
        pcbX={5}
        pcbY={-3.8}
        fontSize={0.7}
      />
    </board>
  )
}

export function LayerChangeBoard(): ReactElement {
  const via: PcbPath = [{ x: 12, y: 0, via: true, toLayer: "bottom" }]
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="LAYER_CHANGE"
        loadLayer="bottom"
        positivePath={[...detour(3, 1.1), ...via]}
        negativePath={[...via, ...detour(17, -1.1)]}
      />
    </board>
  )
}
