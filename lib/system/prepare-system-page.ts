import {
  type AnyCircuitElement,
  type SystemBlockGroup,
  system_block_page,
  system_block_group,
  system_block_component,
  system_block_connection,
} from "circuit-json"

/** Validate only the selected page and order group backgrounds parent-first. */
export function prepareSystemPage(
  circuitJson: AnyCircuitElement[],
  pageId?: string,
) {
  const pages = circuitJson.filter((e) => e.type === "system_block_page")
  const selected =
    pageId === undefined
      ? pages[0]
      : pages.find((p) => p.system_block_page_id === pageId)
  if (!selected) {
    throw new Error(
      pageId === undefined
        ? "Cannot render a system diagram without a system_block_page"
        : `System block page not found: ${pageId}`,
    )
  }
  const page = system_block_page.parse(selected)
  if (
    pages.filter(
      (p) => p.system_block_page_id === selected.system_block_page_id,
    ).length > 1
  ) {
    throw new Error(
      `Duplicate system block page ID: ${page.system_block_page_id}`,
    )
  }
  const elements = circuitJson.filter(
    (e) =>
      "system_block_page_id" in e &&
      e.system_block_page_id === selected.system_block_page_id,
  )
  const groups = elements
    .filter((e) => e.type === "system_block_group")
    .map((e) => system_block_group.parse(e))
  const components = elements
    .filter((e) => e.type === "system_block_component")
    .map((e) => system_block_component.parse(e))
  const connections = elements
    .filter((e) => e.type === "system_block_connection")
    .map((e) => system_block_connection.parse(e))
  const ids = new Set<string>()
  for (const e of [page, ...groups, ...components, ...connections]) {
    const id =
      e.type === "system_block_page"
        ? e.system_block_page_id
        : e.type === "system_block_group"
          ? e.system_block_group_id
          : e.type === "system_block_component"
            ? e.system_block_component_id
            : e.system_block_connection_id
    if (ids.has(id)) throw new Error(`Duplicate system block ID: ${id}`)
    ids.add(id)
  }
  const groupMap = new Map(groups.map((g) => [g.system_block_group_id, g]))
  const orderedGroups: SystemBlockGroup[] = []
  const visited = new Set<string>()
  // Iterative parent traversal also handles deeply nested diagrams without recursion.
  for (const group of groups) {
    const chain: SystemBlockGroup[] = []
    const visiting = new Set<string>()
    let current: SystemBlockGroup | undefined = group
    while (current && !visited.has(current.system_block_group_id)) {
      if (visiting.has(current.system_block_group_id)) {
        throw new Error(
          `Cyclic system block group membership: ${current.system_block_group_id}`,
        )
      }
      visiting.add(current.system_block_group_id)
      chain.push(current)
      const parentId: string | undefined = current.parent_system_block_group_id
      current = parentId === undefined ? undefined : groupMap.get(parentId)
      if (parentId !== undefined && !current) {
        throw new Error(
          `System block group not found on selected page: ${parentId}`,
        )
      }
    }
    for (const item of chain.reverse()) {
      visited.add(item.system_block_group_id)
      orderedGroups.push(item)
    }
  }
  for (const component of components) {
    if (
      component.system_block_group_id !== undefined &&
      !groupMap.has(component.system_block_group_id)
    ) {
      throw new Error(
        `System block group not found on selected page: ${component.system_block_group_id}`,
      )
    }
  }
  const componentIds = new Set(
    components.map((c) => c.system_block_component_id),
  )
  for (const connection of connections) {
    for (const id of [
      connection.from_system_block_component_id,
      connection.to_system_block_component_id,
    ]) {
      if (!componentIds.has(id))
        throw new Error(
          `System block connection endpoint not found on selected page: ${id}`,
        )
    }
  }
  return { page, groups: orderedGroups, components, connections }
}
