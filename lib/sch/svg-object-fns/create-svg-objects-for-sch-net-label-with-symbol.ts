import type { SchematicNetLabel } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import {
  getSchMmFontSize,
  getSchScreenFontSize,
} from "lib/utils/get-sch-font-size"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import {
  applyToPoint,
  compose,
  rotate,
  scale,
  translate,
  type Matrix,
} from "transformation-matrix"
import { estimateTextWidth } from "../estimate-text-width"
import { symbols } from "schematic-symbols"
import { createSvgSchErrorText } from "./create-svg-error-text"
import {
  ninePointAnchorToTextAnchor,
  ninePointAnchorToDominantBaseline,
  ARROW_POINT_WIDTH_FSR,
  END_PADDING_EXTRA_PER_CHARACTER_FSR,
  END_PADDING_FSR,
  getTextOffsets,
} from "../../utils/net-label-utils"
import { getUnitVectorFromOutsideToEdge } from "lib/utils/get-unit-vector-from-outside-to-edge"
import type { ColorMap } from "lib/utils/colors"

export const createSvgObjectsForSchNetLabelWithSymbol = ({
  schNetLabel,
  realToScreenTransform,
  colorMap,
}: {
  schNetLabel: SchematicNetLabel
  realToScreenTransform: Matrix
  colorMap: ColorMap
}): SvgObject[] => {
  if (!schNetLabel.text) return []
  const isNegated = schNetLabel.text.startsWith("N_")
  const labelText = isNegated ? schNetLabel.text.slice(2) : schNetLabel.text
  const svgObjects: SvgObject[] = []

  // If symbol name is provided, draw the symbol
  const symbol = symbols[schNetLabel.symbol_name as keyof typeof symbols]
  if (!symbol) {
    svgObjects.push(
      createSvgSchErrorText({
        text: `Symbol not found: ${schNetLabel.symbol_name}`,
        realCenter: schNetLabel.center,
        realToScreenTransform,
      }),
    )
    return svgObjects
  }
  const symbolPaths = symbol.primitives.filter((p) => p.type === "path")
  const symbolTexts = symbol.primitives.filter((p) => p.type === "text")
  const symbolCircles = symbol.primitives.filter((p) => p.type === "circle")
  const symbolBoxes = symbol.primitives.filter((p) => p.type === "box")

  // Calculate symbol bounds for overlay
  const bounds = {
    minX: Math.min(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.x))),
    maxX: Math.max(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.x))),
    minY: Math.min(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.y))),
    maxY: Math.max(...symbolPaths.flatMap((p) => p.points.map((pt) => pt.y))),
  }

  // Use the same positioning logic as the net label text
  const fontSizeMm = getSchMmFontSize("net_label")
  const textWidthFSR = estimateTextWidth(labelText || "")

  const fullWidthFsr =
    textWidthFSR +
    ARROW_POINT_WIDTH_FSR * 2 +
    END_PADDING_EXTRA_PER_CHARACTER_FSR * labelText.length +
    END_PADDING_FSR

  const realTextGrowthVec = getUnitVectorFromOutsideToEdge(
    schNetLabel.anchor_side,
  )

  const realAnchorPosition = schNetLabel.anchor_position ?? {
    x:
      schNetLabel.center.x -
      (realTextGrowthVec.x * fullWidthFsr * fontSizeMm) / 2,
    y:
      schNetLabel.center.y -
      (realTextGrowthVec.y * fullWidthFsr * fontSizeMm) / 2,
  }

  // Symbols referenced by name already encode their orientation, so
  // no additional rotation should be applied based on `anchor_side`.
  const pathRotation = 0

  // Create transformation matrix that matches net label positioning
  // Calculate the rotation matrix based on the path rotation
  const rotationMatrix = rotate((pathRotation / 180) * Math.PI)

  // Calculate the symbol's end point after rotation
  const symbolBounds = {
    minX: Math.min(
      ...symbol.primitives.flatMap((p) =>
        p.type === "path" ? p.points.map((pt) => pt.x) : [],
      ),
    ),
    maxX: Math.max(
      ...symbol.primitives.flatMap((p) =>
        p.type === "path" ? p.points.map((pt) => pt.x) : [],
      ),
    ),
    minY: Math.min(
      ...symbol.primitives.flatMap((p) =>
        p.type === "path" ? p.points.map((pt) => pt.y) : [],
      ),
    ),
    maxY: Math.max(
      ...symbol.primitives.flatMap((p) =>
        p.type === "path" ? p.points.map((pt) => pt.y) : [],
      ),
    ),
  }

  // Use the first port as the connection point when available. This
  // accounts for symbols whose anchor is not the leftmost edge (e.g.
  // vertically oriented ground/VCC symbols).
  const symbolEndPoint = symbol.ports?.[0]
    ? { x: symbol.ports[0].x, y: symbol.ports[0].y }
    : {
        x: symbolBounds.minX,
        y: (symbolBounds.minY + symbolBounds.maxY) / 2,
      }

  const rotatedSymbolEnd = applyToPoint(rotationMatrix, symbolEndPoint)

  // Adjust the translation to account for rotated symbol end
  const symbolToRealTransform = compose(
    translate(
      realAnchorPosition.x - rotatedSymbolEnd.x,
      realAnchorPosition.y - rotatedSymbolEnd.y,
    ),
    rotationMatrix,
    scale(1), // Use full symbol size
  )

  // Calculate screen bounds
  const [screenMinX, screenMinY] = applyToPoint(
    compose(realToScreenTransform, symbolToRealTransform),
    [bounds.minX, bounds.minY],
  )
  const [screenMaxX, screenMaxY] = applyToPoint(
    compose(realToScreenTransform, symbolToRealTransform),
    [bounds.maxX, bounds.maxY],
  )

  const rectHeight = Math.abs(screenMaxY - screenMinY)
  const rectY = Math.min(screenMinY, screenMaxY)
  const rectWidth = Math.abs(screenMaxX - screenMinX)
  const rectX = Math.min(screenMinX, screenMaxX)

  // Add overlay rectangle
  svgObjects.push({
    name: "rect",
    type: "element",
    value: "",
    attributes: {
      class: "component-overlay",
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "transparent",
    },
    children: [],
  })

  // Draw symbol paths
  for (const path of symbolPaths) {
    const symbolPath = path.points
      .map((p, i) => {
        const [x, y] = applyToPoint(
          compose(realToScreenTransform, symbolToRealTransform),
          [p.x, p.y],
        )
        return `${i === 0 ? "M" : "L"} ${x} ${y}`
      })
      .join(" ")

    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: symbolPath + (path.closed ? " Z" : ""),
        stroke: colorMap.schematic.component_outline,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
  }

  // Draw symbol texts
  for (const text of symbolTexts) {
    const screenTextPos = applyToPoint(
      compose(realToScreenTransform, symbolToRealTransform),
      text,
    )

    let textValue = text.text
    if (textValue === "{REF}") {
      textValue = labelText || ""
    } else if (textValue === "{VAL}") {
      textValue = "" // You can modify this if needed
    }

    // Adjust vertical positioning for left anchor side

    // Calculate scale-adjusted text offset based on transform
    const scale = Math.abs(realToScreenTransform.a)
    const baseOffset = scale * 0.1 // Base offset unit in screen coordinates

    // Symbols define their own text placement, so no additional
    // offsets should be applied based on path rotation.
    const offsetScreenPos = {
      x: screenTextPos.x,
      y: screenTextPos.y,
    }

    svgObjects.push({
      name: "text",
      type: "element",
      attributes: {
        x: offsetScreenPos.x.toString(),
        y: offsetScreenPos.y.toString(),
        fill: colorMap.schematic.label_local,
        "font-family": "sans-serif",
        "text-anchor": ninePointAnchorToTextAnchor[text.anchor],
        "dominant-baseline": ninePointAnchorToDominantBaseline[text.anchor],
        "font-size": `${getSchScreenFontSize(realToScreenTransform, "reference_designator")}px`,
        ...(isNegated && textValue === labelText
          ? { style: "text-decoration: overline;" }
          : {}),
      },
      children: [
        {
          type: "text",
          value: textValue,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
  }
  // Draw symbol boxes
  for (const box of symbolBoxes) {
    const screenBoxPos = applyToPoint(
      compose(realToScreenTransform, symbolToRealTransform),
      box,
    )
    const symbolToScreenScale = compose(
      realToScreenTransform,
      symbolToRealTransform,
    ).a

    svgObjects.push({
      name: "rect",
      type: "element",
      attributes: {
        x: screenBoxPos.x.toString(),
        y: screenBoxPos.y.toString(),
        width: (box.width * symbolToScreenScale).toString(),
        height: (box.height * symbolToScreenScale).toString(),
        fill: "red",
      },
      value: "",
      children: [],
    })
  }

  // Draw symbol circles
  for (const circle of symbolCircles) {
    const screenCirclePos = applyToPoint(
      compose(realToScreenTransform, symbolToRealTransform),
      circle,
    )
    const symbolToScreenScale = compose(
      realToScreenTransform,
      symbolToRealTransform,
    ).a

    svgObjects.push({
      name: "circle",
      type: "element",
      attributes: {
        cx: screenCirclePos.x.toString(),
        cy: screenCirclePos.y.toString(),
        r: (circle.radius * symbolToScreenScale).toString(),
        fill: "none",
        stroke: colorMap.schematic.component_outline,
        "stroke-width": `${getSchStrokeSize(realToScreenTransform)}px`,
      },
      value: "",
      children: [],
    })
  }

  return svgObjects
}
