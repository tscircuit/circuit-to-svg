import type { AnyCircuitElement } from "circuit-json"
import {
  getDifferentialPairPhaseSkewStrokes,
  type PhaseSkewColors,
} from "circuit-json-to-differential-pair-phase-skew"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createPcbTraceStroke } from "./create-pcb-trace-stroke"

export function createSvgObjectsFromDifferentialPairPhaseSkew(
  circuitJson: AnyCircuitElement[],
  { layer, transform }: PcbContext,
  colors?: Partial<PhaseSkewColors>,
) {
  const strokes = getDifferentialPairPhaseSkewStrokes(circuitJson, { colors })
  return strokes
    .filter((stroke) => !layer || stroke.layer === layer)
    .map((stroke) =>
      createPcbTraceStroke(stroke, transform, {
        color: stroke.color,
        className: "pcb-differential-pair-phase-skew",
        dataType: "pcb_differential_pair_phase_skew",
        shapeRendering: "geometricPrecision",
      }),
    )
}
