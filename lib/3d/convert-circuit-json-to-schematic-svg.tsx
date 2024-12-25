import type { AnySoupElement } from "@tscircuit/soup"
import type { AnyCircuitElement } from "circuit-json"
import { createBoardGeomFromSoup } from "@tscircuit/3d-viewer/src/soup-to-3d"
import { STLModel } from "@tscircuit/3d-viewer/src/three-components/STLModel"
import { AnyCadComponent } from "@tscircuit/3d-viewer/src/AnyCadComponent"
import { su } from "@tscircuit/soup-util"
import { createStlsFromGeom } from "./svg-object-fns/create-stls-from-geom"
import { SVGRenderer } from "three-stdlib"
import { extend, createRoot, advance, flushSync } from "@react-three/fiber"
import { Grid } from "@react-three/drei"
import * as THREE from "three"

interface Options {
  width?: number
  height?: number
}

export function convertCircuitJsonTo3dSvg(
  soup: AnyCircuitElement[],
  { width = 1200, height = 600 } = {} as Options,
): string {
  extend(THREE)
  const boardGeom = createBoardGeomFromSoup(soup as AnySoupElement[])
  const boardStls = createStlsFromGeom(boardGeom)
  const cad_components = su(soup).cad_component.list()

  const gl = new SVGRenderer()

  // @ts-expect-error should be fine. see https://github.com/pmndrs/react-three-fiber/blob/3acb4b041354e8084e7833c9254326ef6282cb5c/example/src/demos/SVGRenderer.tsx#L54
  const root = createRoot({})
    .configure({
      gl, frameloop: "never",
      scene: { up: [0, 0, 1] },
      camera: { position: [0, 0, 50], up: [0, 0, 1] },
      size: { width, height, top: 0, left: 0 },
    })

  // ensure DOM updated immediately
  flushSync(() => root.render(<>
    <ambientLight intensity={Math.PI / 2} />
    <pointLight
      position={[-10, -10, 10]}
      decay={0}
      intensity={Math.PI / 4}
    />
    <Grid
      rotation={[Math.PI / 2, 0, 0]}
      infiniteGrid={true}
      cellSize={1}
      sectionSize={10}
    />
    {boardStls.map(({ stlUrl, color }, index) => (
      <STLModel
        key={stlUrl}
        stlUrl={stlUrl}
        color={color}
        opacity={index === 0 ? 0.95 : 1}
      />
    ))}
    {cad_components.map((cad_component) => (
      <AnyCadComponent
        key={cad_component.cad_component_id}
        cad_component={cad_component}
      />
    ))}
  </>))
  advance(0) // manual rAF cuz `frameloop: "never"`

  return gl.domElement.outerHTML
}



