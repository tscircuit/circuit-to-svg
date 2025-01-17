import type { AnySoupElement } from "@tscircuit/soup"
import type { AnyCircuitElement } from "circuit-json"
import { createBoardGeomFromSoup } from "@tscircuit/3d-viewer/src/soup-to-3d"
import { STLModel } from "./components/STLModel"
import { AnyCadComponent } from "@tscircuit/3d-viewer/src/AnyCadComponent"
import { su } from "@tscircuit/soup-util"
import { createStlsFromGeom } from "./svg-object-fns/create-stls-from-geom"
import { SVGRenderer } from "../../node_modules/three-stdlib/renderers/SVGRenderer.js"
import {
  extend,
  createRoot,
  flushSync,
  type RenderProps,
} from "@react-three/fiber/dist/react-three-fiber.esm.js"
import * as THREE from "three"

interface Options {
  width?: number
  height?: number
  camera?: (RenderProps<OffscreenCanvas>["camera"] | "top" | "bottom")[]
}

export function convertCircuitJsonTo3dSvg(
  soup: AnyCircuitElement[],
  { width = 1200, height = 600, camera } = {} as Options,
): string[] {
  extend(THREE)
  const boardGeom = createBoardGeomFromSoup(soup as AnySoupElement[])
  const boardStls = createStlsFromGeom(boardGeom)
  const cad_components = su(soup).cad_component.list()

  // @ts-expect-error e.layer still untyped
  camera ??= soup.some((e) => e.layer === "bottom")
    ? ["top", "bottom"]
    : ["top"]

  const boards = soup.filter((e) => e.type === "pcb_board")
  const dimensions = boards.flatMap((b) => [b.width, b.height])
  const zoom =
    dimensions.reduce((prev, val) => prev + val, 0) / dimensions.length

  // @ts-expect-error should be fine. see https://github.com/pmndrs/react-three-fiber/blob/3acb4b041354e8084e7833c9254326ef6282cb5c/example/src/demos/SVGRenderer.tsx#L54
  const root = createRoot({}).configure({
    gl: new SVGRenderer(),
    frameloop: "never",
    size: { width, height, top: 0, left: 0 },
  })

  // ensure DOM updated immediately
  const state = flushSync(() =>
    root.render(
      <>
        <ambientLight intensity={Math.PI / 2} />
        <pointLight
          position={[-10, -10, 10]}
          decay={0}
          intensity={Math.PI / 4}
        />
        {boardStls.map(({ hash, stlData, color }, index) => (
          <STLModel
            key={hash}
            stlData={stlData}
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
      </>,
    ),
  ).getState()

  const svgs = Array(camera.length)
  for (let i = 0; i < svgs.length; i++) {
    switch (camera[i]) {
      case "top":
        state.camera.position.z = zoom
        break
      case "bottom":
        state.camera.position.z = -zoom
        state.camera.rotateX(Math.PI)
        break
    }
    state.advance(0) // manual rAF due to `frameloop: "never"`
    svgs[i] = state.gl.domElement.outerHTML
  }
  return svgs
}
