import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbTrace,
  PcbVia,
  PcbViaInput,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { PcbSvgOptions } from "lib/pcb/convert-circuit-json-to-pcb-svg"

const via: PcbVia = {
  type: "pcb_via",
  pcb_via_id: "via",
  x: 50,
  y: 50,
  outer_diameter: 40,
  hole_diameter: 20,
  layers: ["top", "bottom"],
}

const topMask = [0, 136, 0, 255]
const bottomMask = [0, 68, 136, 255]
const topCopper = [255, 0, 0, 255]
const bottomCopper = [0, 0, 255, 255]
const drill = [255, 255, 255, 255]

function renderVia(
  pcbVia: PcbVia & Pick<PcbViaInput, "is_tented">,
  options: PcbSvgOptions = {},
  traces: PcbTrace[] = [],
) {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 50, y: 50 },
      width: 100,
      height: 100,
      num_layers: 4,
      thickness: 1.6,
      material: "fr4",
    },
    pcbVia,
    ...traces,
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    width: 100,
    height: 100,
    drawPaddingOutsideBoard: false,
    showSolderMask: true,
    colorOverrides: {
      soldermask: { top: "#00ff00", bottom: "#00ff00" },
      soldermaskOverCopper: { top: "#008800", bottom: "#004488" },
      copper: { top: "#ff0000", bottom: "#0000ff" },
      drill: "#ffffff",
    },
    ...options,
  })
  const rendered = new Resvg(svg, {
    font: { loadSystemFonts: false },
  }).render()
  const pixel = (x: number, y: number) => {
    const offset = (y * rendered.width + x) * 4
    return Array.from(rendered.pixels.slice(offset, offset + 4))
  }
  return {
    svg,
    center: pixel(50, 50),
    ring: pixel(65, 50),
    traceAtDrill: pixel(45, 50),
    background: pixel(80, 80),
  }
}

test("vias without tenting flags remain exposed on both faces", () => {
  expect(renderVia(via, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(via, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("top-only tenting covers the top ring and drill and leaves the bottom exposed", () => {
  const topTented = { ...via, tented_on_top: true, tented_on_bottom: false }
  expect(renderVia(topTented, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  expect(renderVia(topTented, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("bottom-only tenting covers the bottom ring and drill and leaves the top exposed", () => {
  const bottomTented = { ...via, tented_on_top: false, tented_on_bottom: true }
  expect(renderVia(bottomTented, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(bottomTented, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
})

test("both-side tenting covers both rings and drills", () => {
  const bothTented = { ...via, tented_on_top: true, tented_on_bottom: true }
  expect(renderVia(bothTented, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  expect(renderVia(bothTented, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
})

test("explicit false keeps both faces exposed", () => {
  const exposed = { ...via, tented_on_top: false, tented_on_bottom: false }
  expect(renderVia(exposed, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(exposed, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("legacy is_tented covers both faces when per-side flags are omitted", () => {
  const legacy = { ...via, is_tented: true }
  expect(renderVia(legacy, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  expect(renderVia(legacy, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
})

test("legacy is_tented false leaves both faces exposed", () => {
  const legacy = { ...via, is_tented: false }
  expect(renderVia(legacy, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(legacy, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("explicit top false overrides legacy tenting while the bottom inherits it", () => {
  const topExposed = { ...via, is_tented: true, tented_on_top: false }
  expect(renderVia(topExposed, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(topExposed, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
})

test("explicit bottom false overrides legacy tenting while the top inherits it", () => {
  const bottomExposed = { ...via, is_tented: true, tented_on_bottom: false }
  expect(renderVia(bottomExposed, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  expect(renderVia(bottomExposed, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("explicit top true overrides legacy false", () => {
  const topTented = { ...via, is_tented: false, tented_on_top: true }
  expect(renderVia(topTented, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  expect(renderVia(topTented, { layer: "bottom" })).toMatchObject({
    center: drill,
    ring: bottomCopper,
  })
})

test("explicit bottom true overrides legacy false", () => {
  const bottomTented = { ...via, is_tented: false, tented_on_bottom: true }
  expect(renderVia(bottomTented, { layer: "top" })).toMatchObject({
    center: drill,
    ring: topCopper,
  })
  expect(renderVia(bottomTented, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
})

test("the default view uses the top tenting flag", () => {
  expect(
    renderVia({ ...via, tented_on_top: true, tented_on_bottom: false }),
  ).toMatchObject({ center: topMask, ring: topMask })
})

test("connected traces and route-via points do not reopen a tented drill", () => {
  const bothTented = { ...via, tented_on_top: true, tented_on_bottom: true }
  const traces: PcbTrace[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "top_trace",
      route: [
        { route_type: "wire", x: 10, y: 50, layer: "top", width: 4 },
        { route_type: "wire", x: 50, y: 50, layer: "top", width: 4 },
        {
          route_type: "via",
          x: 50,
          y: 50,
          from_layer: "top",
          to_layer: "bottom",
        },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom_trace",
      route: [
        { route_type: "wire", x: 10, y: 50, layer: "bottom", width: 4 },
        { route_type: "wire", x: 50, y: 50, layer: "bottom", width: 4 },
        {
          route_type: "via",
          x: 50,
          y: 50,
          from_layer: "top",
          to_layer: "bottom",
        },
      ],
    },
  ]
  expect(renderVia(bothTented, { layer: "top" }, traces)).toMatchObject({
    center: topMask,
    ring: topMask,
    traceAtDrill: topMask,
  })
  expect(renderVia(bothTented, { layer: "bottom" }, traces)).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
    traceAtDrill: bottomMask,
  })
})

test("a top blind via has no opening on the bottom surface", () => {
  const blind: PcbVia = {
    ...via,
    layers: ["top", "inner1"],
    tented_on_top: true,
    tented_on_bottom: false,
  }
  expect(renderVia(blind, { layer: "top" })).toMatchObject({
    center: topMask,
    ring: topMask,
  })
  const bottom = renderVia(blind, { layer: "bottom" })
  expect(bottom.svg).not.toContain('data-type="pcb_via"')
  expect(bottom.center).toEqual(bottom.background)
  expect(bottom.ring).toEqual(bottom.background)
})

test("a bottom blind via has no opening on the top surface", () => {
  const blind: PcbVia = {
    ...via,
    layers: ["inner1", "bottom"],
    tented_on_top: false,
    tented_on_bottom: true,
  }
  expect(renderVia(blind, { layer: "bottom" })).toMatchObject({
    center: bottomMask,
    ring: bottomMask,
  })
  const top = renderVia(blind, { layer: "top" })
  expect(top.svg).not.toContain('data-type="pcb_via"')
  expect(top.center).toEqual(top.background)
  expect(top.ring).toEqual(top.background)
})

test("a buried via has no openings on either surface", () => {
  const buried: PcbVia = { ...via, layers: ["inner1", "inner2"] }
  const top = renderVia(buried, { layer: "top" })
  const bottom = renderVia(buried, { layer: "bottom" })
  expect(top.svg).not.toContain('data-type="pcb_via"')
  expect(bottom.svg).not.toContain('data-type="pcb_via"')
  expect(top.center).toEqual(top.background)
  expect(bottom.center).toEqual(bottom.background)
})

test("tenting does not change copper-only rendering on either face", () => {
  const bothTented = { ...via, tented_on_top: true, tented_on_bottom: true }
  const top = renderVia(bothTented, { layer: "top", showSolderMask: false })
  const bottom = renderVia(bothTented, {
    layer: "bottom",
    showSolderMask: false,
  })
  expect(top.svg).toBe(
    renderVia(via, { layer: "top", showSolderMask: false }).svg,
  )
  expect(bottom.svg).toBe(
    renderVia(via, { layer: "bottom", showSolderMask: false }).svg,
  )
  expect(top.center).toEqual(drill)
  expect(bottom.center).toEqual(drill)
})

test("surface tenting does not cover an inner-layer copper view", () => {
  const tented: PcbVia = {
    ...via,
    layers: ["top", "inner1"],
    tented_on_top: true,
  }
  const inner = renderVia(tented, { layer: "inner1" })
  expect(inner.svg).not.toContain('class="pcb-via-tenting"')
  expect(inner.center).toEqual(drill)
})
