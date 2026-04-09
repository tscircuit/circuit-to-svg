import type { SvgObject } from "lib/svg-object"

type SvgAttrs = Record<string, string>

function getSchematicComponentIdFromSvgObject(
  svgObject: SvgObject,
): string | undefined {
  const attributes = svgObject.attributes as SvgAttrs | undefined
  return attributes?.["data-schematic-component-id"]
}

function getCssClassFromSvgObject(svgObject: SvgObject): string | undefined {
  const attributes = svgObject.attributes as SvgAttrs | undefined
  return attributes?.class
}

function insertPrimitivesIntoComponentGroup(
  componentGroup: SvgObject,
  primitives: SvgObject[],
): void {
  if (!componentGroup.children) {
    componentGroup.children = [...primitives]
    return
  }

  let overlayIndex = -1
  for (let i = 0; i < componentGroup.children.length; i++) {
    const child = componentGroup.children[i]
    if (!child || child.type !== "element") continue
    const cssClass = getCssClassFromSvgObject(child)
    if (cssClass === "component-overlay") {
      overlayIndex = i
      break
    }
  }

  if (overlayIndex === -1) {
    componentGroup.children.push(...primitives)
    return
  }

  componentGroup.children.splice(overlayIndex, 0, ...primitives)
}

export function moveComponentOwnedPrimitivesToComponentGroups(
  componentSvgObjects: SvgObject[],
  primitiveSvgObjects: SvgObject[],
): SvgObject[] {
  const componentSvgById = new Map<string, SvgObject>()
  for (const componentSvg of componentSvgObjects) {
    const componentId = getSchematicComponentIdFromSvgObject(componentSvg)
    if (!componentId) continue
    componentSvgById.set(componentId, componentSvg)
  }

  const primitiveSvgByComponentId = new Map<string, SvgObject[]>()
  const remainingPrimitiveSvgObjects: SvgObject[] = []

  for (const primitiveSvg of primitiveSvgObjects) {
    const componentId = getSchematicComponentIdFromSvgObject(primitiveSvg)
    if (!componentId || !componentSvgById.has(componentId)) {
      remainingPrimitiveSvgObjects.push(primitiveSvg)
      continue
    }

    const componentPrimitiveSvgObjects =
      primitiveSvgByComponentId.get(componentId)
    if (componentPrimitiveSvgObjects) {
      componentPrimitiveSvgObjects.push(primitiveSvg)
    } else {
      primitiveSvgByComponentId.set(componentId, [primitiveSvg])
    }
  }

  for (const [
    componentId,
    componentPrimitiveSvgObjects,
  ] of primitiveSvgByComponentId.entries()) {
    const componentSvg = componentSvgById.get(componentId)
    if (!componentSvg) continue
    insertPrimitivesIntoComponentGroup(
      componentSvg,
      componentPrimitiveSvgObjects,
    )
  }

  return remainingPrimitiveSvgObjects
}
