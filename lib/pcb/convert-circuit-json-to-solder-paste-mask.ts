import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "./convert-circuit-json-to-pcb-svg"
import { createSvgObjectsFromSolderPaste } from "./svg-object-fns/create-svg-objects-from-pcb-solder-paste"
import { type INode as SvgObject, stringify } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  scale,
  translate,
} from "transformation-matrix"

/**
 * Creates an SVG specifically for solder paste mask
 * @param soup Circuit JSON elements
 * @param options Configuration options
 * @returns SVG string representation of the solder paste mask
 */
export function convertCircuitJsonToSolderPasteMask(
  soup: AnyCircuitElement[],
  options: { layer: "top" | "bottom"; width?: number; height?: number },
): string {
  // Filter to only include solder paste elements for the specified layer
  const solderPasteElements = soup.filter(
    (elm) => elm.type === "pcb_solder_paste" && elm.layer === options.layer,
  )

  // Include other necessary elements like the board
  const boardElements = soup.filter((elm) => elm.type === "pcb_board")

  // Combine filtered elements
  const filteredSoup = [...boardElements, ...solderPasteElements]

  // Use a custom handler for solder paste elements
  const customCreateSvgObjects = (
    elm: AnyCircuitElement,
    transform: Matrix,
  ): SvgObject[] => {
    if (elm.type === "pcb_solder_paste") {
      return createSvgObjectsFromSolderPaste(elm, transform)
    }
    return [] // For other elements, return empty array as we only want solder paste
  }

  // Use the PCB SVG converter with our custom handler
  return convertCircuitJsonToPcbSvg(filteredSoup, {
    width: options.width,
    height: options.height,
    customCreateSvgObjects,
  })
}
