import type { AnyCircuitElement, PcbFootprintOverlapError } from "circuit-json"
import type { SvgObject } from "../../../lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

function annotateFootprintErrorSvgObjects(
  svgObjects: SvgObject[],
): SvgObject[] {
  return svgObjects.map((obj) => ({
    ...obj,
    attributes: {
      ...obj.attributes,
      "data-type": "pcb_footprint_overlap_error",
      "data-pcb-layer": "overlay",
    },
  }))
}

export function createSvgObjectsFromPcbFootprintOverlapError(
  error: PcbFootprintOverlapError,
  circuitJson: AnyCircuitElement[],
  ctx: PcbContext,
): SvgObject[] {
  const { transform, shouldDrawErrors } = ctx
  if (!shouldDrawErrors) return []

  const svgObjects: SvgObject[] = []

  // Find all the elements referenced in the error
  const referencedElements: Array<{
    x: number
    y: number
    type: string
    id: string
    pcb_port_id?: string
  }> = []

  // Check SMT pads
  let padPortIds: string[] = []
  if (error.pcb_smtpad_ids) {
    for (const padId of error.pcb_smtpad_ids) {
      const pad = circuitJson.find(
        (el) => el.type === "pcb_smtpad" && el.pcb_smtpad_id === padId,
      ) as
        | {
            x: number
            y: number
            type: string
            pcb_smtpad_id: string
            pcb_port_id?: string
          }
        | undefined
      if (pad) {
        referencedElements.push({
          x: pad.x,
          y: pad.y,
          type: "pcb_smtpad",
          id: padId,
          pcb_port_id: pad.pcb_port_id,
        })
        if (pad.pcb_port_id) padPortIds.push(pad.pcb_port_id)
      }
    }
  }

  // If all SMT pads share the same pcb_port_id, skip error indicator for those pads
  const allPadsSamePort =
    padPortIds.length > 1 && padPortIds.every((id) => id === padPortIds[0])
  let filteredReferencedElements = referencedElements
  if (allPadsSamePort) {
    filteredReferencedElements = referencedElements.filter(
      (e) => e.type !== "pcb_smtpad",
    )
  }

  // Check plated holes
  if (error.pcb_plated_hole_ids) {
    for (const holeId of error.pcb_plated_hole_ids) {
      const hole = circuitJson.find(
        (el) =>
          el.type === "pcb_plated_hole" && el.pcb_plated_hole_id === holeId,
      ) as
        | { x: number; y: number; type: string; pcb_plated_hole_id: string }
        | undefined
      if (hole) {
        filteredReferencedElements.push({
          x: hole.x,
          y: hole.y,
          type: "pcb_plated_hole",
          id: holeId,
        })
      }
    }
  }

  // Check holes
  if (error.pcb_hole_ids) {
    for (const holeId of error.pcb_hole_ids) {
      const hole = circuitJson.find(
        (el) => el.type === "pcb_hole" && el.pcb_hole_id === holeId,
      ) as
        | { x: number; y: number; type: string; pcb_hole_id: string }
        | undefined
      if (hole) {
        filteredReferencedElements.push({
          x: hole.x,
          y: hole.y,
          type: "pcb_hole",
          id: holeId,
        })
      }
    }
  }

  // If we found elements, draw error indicators at their positions
  if (filteredReferencedElements.length > 0) {
    // Calculate center point of all elements
    const centerX =
      filteredReferencedElements.reduce((sum, el) => sum + el.x, 0) /
      filteredReferencedElements.length
    const centerY =
      filteredReferencedElements.reduce((sum, el) => sum + el.y, 0) /
      filteredReferencedElements.length

    const screenCenter = applyToPoint(transform, { x: centerX, y: centerY })

    // Draw error indicator at center
    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: (screenCenter.x - 5).toString(),
        y: (screenCenter.y - 5).toString(),
        width: "10",
        height: "10",
        fill: "red",
        transform: `rotate(45 ${screenCenter.x} ${screenCenter.y})`,
      },
      children: [],
      value: "",
    })

    // Draw error message
    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        x: screenCenter.x.toString(),
        y: (screenCenter.y - 15).toString(),
        fill: "red",
        "font-family": "sans-serif",
        "font-size": "12",
        "text-anchor": "middle",
      },
      children: [
        {
          type: "text",
          value: error.message || "PCB Footprint Overlap Error",
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })

    // Draw indicators at each affected element
    for (const element of filteredReferencedElements) {
      const screenPos = applyToPoint(transform, { x: element.x, y: element.y })
      // Draw a red diamond at each element
      svgObjects.push({
        name: "rect",
        type: "element",
        attributes: {
          x: (screenPos.x - 5).toString(),
          y: (screenPos.y - 5).toString(),
          width: "10",
          height: "10",
          fill: "red",
          transform: `rotate(45 ${screenPos.x} ${screenPos.y})`,
        },
        children: [],
        value: "",
      })

      // Draw a dashed line from center to this element
      if (referencedElements.length > 1) {
        svgObjects.push({
          name: "line",
          type: "element",
          attributes: {
            x1: screenCenter.x.toString(),
            y1: screenCenter.y.toString(),
            x2: screenPos.x.toString(),
            y2: screenPos.y.toString(),
            stroke: "red",
            "stroke-width": "1.5",
            "stroke-dasharray": "2,2",
          },
          children: [],
          value: "",
        })
      }
    }
  }

  return annotateFootprintErrorSvgObjects(svgObjects)
}
