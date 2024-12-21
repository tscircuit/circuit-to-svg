import type { AnySoupElement } from "@tscircuit/soup"
import { CadViewer } from "@tscircuit/3d-viewer"
import { SVGRenderer } from "three-stdlib"
import { events, extend, createRoot, useThree, type Camera } from "@react-three/fiber"
import * as THREE from "three"

interface Options {
  width?: number
  height?: number
  camera: Camera
}

// NOTE: this is not React component
export function convertCircuitJsonTo3dSvg(
  soup: AnySoupElement[],
  { width = 1200, height = 600, camera = {
    position: [0, 0, 50],
  } } = {} as Options,
): string {
  extend({
    ...THREE,
    Canvas: function(props: Record<string, unknown>) {
      console.log(props, props?.children) // but it got undefined, undefined
      // return root
    },
    Div: function() { return document.createElement("div") },
  })

  const gl = new SVGRenderer()
  gl.setSize(width, height)

  const Internal = () => {
    const { scene, camera } = useThree()
    gl.render(scene, camera)
    return <></>
  }
  const container = document.createElement("template") // @ts-ignore see https://github.com/pmndrs/react-three-fiber/blob/3acb4b041354e8084e7833c9254326ef6282cb5c/example/src/demos/SVGRenderer.tsx#L54
  const root = createRoot(container)
  // @ts-ignore see https://r3f.docs.pmnd.rs/api/canvas#createroot 
  root.configure({ events, camera, size: { width, height }, gl })
  root.render(<CadViewer soup={soup}><Internal /></CadViewer>)
  setTimeout(() => console.log(container.outerHTML), 1000)
  return gl.domElement.outerHTML
}
