declare module "@jscad/stl-serializer" {
  export function serialize(
    options: { binary: true },
    objects: any[],
  ): ArrayBuffer[]
}
