import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { AssemblySvgContext } from "../convert-circuit-json-to-assembly-svg"

const PAD_COLOR = "rgb(210, 210, 210)" // Lighter gray for pads

export function createSvgObjectsFromAssemblySmtPad(
  pad: PcbSmtPad,
  ctx: AssemblySvgContext,
): SvgObject[] {
  const { transform } = ctx

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      return [
        {
          name: "rect",
          type: "element",
          attributes: {
            class: "assembly-pad",
            fill: PAD_COLOR,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-layer": pad.layer,
          },
          value: "",
          children: [],
        },
      ]
    }

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-layer": pad.layer,
        },
        value: "",
        children: [],
      },
    ]
  }

  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-layer": pad.layer,
        },
        value: "",
        children: [],
      },
    ]
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    return [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-layer": pad.layer,
        },
        value: "",
        children: [],
      },
    ]
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )

    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "assembly-pad",
          fill: PAD_COLOR,
          points: points.map((p) => p.join(",")).join(" "),
          "data-layer": pad.layer,
        },
        value: "",
        children: [],
      },
    ]
  }

  return []
}
