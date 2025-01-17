declare module "@jscad/stl-serializer" {
  export function serialize(
    options: { binary: true },
    objects: any[],
  ): ArrayBuffer[]
}

declare module "@react-three/fiber/dist/react-three-fiber.esm.js" {
  export * from "@react-three/fiber"
}
