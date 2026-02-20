import type { PcbComponent, LayerRef, Point } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import type { PinoutSvgContext } from "../convert-circuit-json-to-pinout-svg"
import { su } from "@tscircuit/circuit-json-util"
import { applyToPoint } from "transformation-matrix"

const COMPONENT_FILL_COLOR = "rgba(120, 120, 120, 0.6)"
const COMPONENT_LABEL_COLOR = "rgba(255, 255, 255, 0.9)"

export function createSvgObjectsFromPinoutComponent(
  elm: PcbComponent,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const { transform, soup } = ctx
  const { center, width, height, rotation = 0, source_component_id } = elm
  const sourceComponent = su(soup).source_component.get(source_component_id)

  if (
    !center ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    width === 0 ||
    height === 0
  ) {
    return []
  }

  // Check if component box should be shown (default: hidden for pinout diagrams)
  const showComponentBox = (ctx as any).show_component_box ?? false
  if (!showComponentBox) {
    return []
  }

  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const transformStr = `translate(${x}, ${y})`

  const children: SvgObject[] = [
    {
      name: "rect",
      type: "element",
      attributes: {
        class: "pinout-component-box",
        x: (-scaledWidth / 2).toString(),
        y: (-scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: COMPONENT_FILL_COLOR,
        transform: `rotate(${rotation}deg)`,
      },
      value: "",
      children: [],
    },
  ]

  if (sourceComponent?.name) {
    const labelFontSize = Math.min(scaledWidth, scaledHeight) * 0.4
    children.push({
      name: "text",
      type: "element",
      attributes: {
        x: "0",
        y: "0",
        fill: COMPONENT_LABEL_COLOR,
        "font-size": `${labelFontSize}px`,
        "font-family": "sans-serif",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      },
      children: [
        {
          type: "text",
          value: sourceComponent.name,
          name: "",
          attributes: {},
          children: [],
        },
      ],
      value: "",
    })
  }

  return [
    {
      name: "g",
      type: "element",
      attributes: {
        transform: transformStr,
      },
      children,
      value: "",
    },
  ]
}
