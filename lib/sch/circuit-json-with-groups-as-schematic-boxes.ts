import type {
  AnyCircuitElement,
  SchematicGroup,
  SchematicComponent,
} from "circuit-json"
import type { SchematicBox } from "circuit-json"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"

function createSchematicBoxFromGroup(
  group: SchematicGroup,
  groupedComponents: SchematicComponent[],
): SchematicBox | null {
  let x: number | null = null
  let y: number | null = null
  let width: number | null = null
  let height: number | null = null

  if (
    group.center &&
    Number.isFinite(group.center.x) &&
    Number.isFinite(group.center.y) &&
    Number.isFinite(group.width) &&
    Number.isFinite(group.height) &&
    group.width > 0 &&
    group.height > 0
  ) {
    width = group.width
    height = group.height
    x = group.center.x - width / 2
    y = group.center.y - height / 2
  } else if (groupedComponents.length > 0) {
    const bounds = getSchematicBoundsFromCircuitJson(groupedComponents, 0)
    if (
      Number.isFinite(bounds.minX) &&
      Number.isFinite(bounds.minY) &&
      Number.isFinite(bounds.maxX) &&
      Number.isFinite(bounds.maxY)
    ) {
      const padding = 0.3
      x = bounds.minX - padding
      y = bounds.minY - padding
      width = bounds.maxX - bounds.minX + padding * 2
      height = bounds.maxY - bounds.minY + padding * 2
    }
  }

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null
  }

  return {
    type: "schematic_box",
    x: x!,
    y: y!,
    width: width!,
    height: height!,
    is_dashed: false,
  }
}

export function circuitJsonWithGroupsAsSchematicBoxes(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const boxedGroupsById = new Map<string, SchematicGroup>()

  for (const elm of circuitJson) {
    if (elm.type !== "schematic_group" || elm.show_as_schematic_box !== true) {
      continue
    }
    boxedGroupsById.set(elm.schematic_group_id, elm)
  }

  if (boxedGroupsById.size === 0) {
    return circuitJson
  }

  const componentsByGroupId = new Map<string, SchematicComponent[]>()
  const hiddenComponentIds = new Set<string>()

  for (const elm of circuitJson) {
    if (elm.type !== "schematic_component") continue
    const groupId = elm.schematic_group_id
    if (!groupId || !boxedGroupsById.has(groupId)) continue

    hiddenComponentIds.add(elm.schematic_component_id)

    const components = componentsByGroupId.get(groupId)
    if (components) {
      components.push(elm)
    } else {
      componentsByGroupId.set(groupId, [elm])
    }
  }

  const generatedBoxes: SchematicBox[] = []

  for (const group of boxedGroupsById.values()) {
    const groupComponents =
      componentsByGroupId.get(group.schematic_group_id) ?? []
    const schematicBox = createSchematicBoxFromGroup(group, groupComponents)
    if (schematicBox) {
      generatedBoxes.push(schematicBox)
    }
  }

  return [
    ...circuitJson.filter((elm) => {
      if (elm.type !== "schematic_component") return true
      return !hiddenComponentIds.has(elm.schematic_component_id)
    }),
    ...generatedBoxes,
  ]
}
