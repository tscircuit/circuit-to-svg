import type { PcbTrace } from "circuit-json"

const routeToVia = (x: number) =>
  [
    { route_type: "wire", x: x - 4, y: 1, width: 0.2, layer: "bottom" },
    { route_type: "wire", x, y: 1, width: 0.2, layer: "bottom" },
    {
      route_type: "via",
      x,
      y: 1,
      from_layer: "bottom",
      to_layer: "inner2",
      outer_diameter: 2,
      hole_diameter: 1,
    },
  ] satisfies PcbTrace["route"]

export default function RouteViaReproduction() {
  return (
    <board width={32} height={18} layers={4}>
      <pcbnotetext
        pcbX={-8}
        pcbY={7}
        layer="bottom"
        fontSize={0.65}
        text="1. EXPLICIT VIA DIMENSIONS"
      />
      <pcbnotetext
        pcbX={-8}
        pcbY={5}
        layer="bottom"
        fontSize={0.55}
        text="EXPECTED: 2mm PAD / 1mm DRILL"
      />
      <pcbnotetext
        pcbX={-8}
        pcbY={3}
        layer="bottom"
        fontSize={0.55}
        text="ROUTE VIA ON A 0.2mm WIRE"
      />
      <pcbtrace route={routeToVia(-8)} />

      <pcbnotetext
        pcbX={8}
        pcbY={7}
        layer="bottom"
        fontSize={0.65}
        text="2. DIFFERENT COPPER LAYERS"
      />
      <pcbnotetext
        pcbX={8}
        pcbY={5}
        layer="bottom"
        fontSize={0.55}
        text="BOTTOM TO INNER2 ROUTE VIA"
      />
      <pcbnotetext
        pcbX={8}
        pcbY={3}
        layer="bottom"
        fontSize={0.45}
        text="TOP TO INNER1 VIA AT THE SAME POSITION"
      />
      <pcbtrace route={routeToVia(8)} />
      <via
        pcbX={8}
        pcbY={1}
        fromLayer="top"
        toLayer="inner1"
        outerDiameter={2}
        holeDiameter={1}
      />

      <via
        pcbX={-8}
        pcbY={-4}
        fromLayer="bottom"
        toLayer="inner2"
        outerDiameter={2}
        holeDiameter={1}
      />
      <via
        pcbX={8}
        pcbY={-4}
        fromLayer="bottom"
        toLayer="inner2"
        outerDiameter={2}
        holeDiameter={1}
      />
      <pcbnotetext
        pcbX={-8}
        pcbY={-6}
        layer="bottom"
        fontSize={0.55}
        text="CONTROL: STANDALONE 2mm / 1mm VIA"
      />
      <pcbnotetext
        pcbX={8}
        pcbY={-6}
        layer="bottom"
        fontSize={0.55}
        text="CONTROL: STANDALONE 2mm / 1mm VIA"
      />
      <pcbnotetext
        pcbX={0}
        pcbY={-8}
        layer="bottom"
        fontSize={0.55}
        text="BOTTOM VIEW: EACH ROUTE VIA SHOULD MATCH THE CONTROL BELOW IT"
      />
    </board>
  )
}
