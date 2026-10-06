import { expect, test } from "bun:test"
import type { PcbBoard, PcbComponent, PcbVia, SourceGroup } from "circuit-json"
import { createBoardOwnerMap } from "lib/pcb/create-board-owner-map"
import { boardViaTentingCircuit } from "./pcb-via-board-tenting.fixture"

test("board ownership is precomputed from IDs regardless of positions or element order", () => {
  const elements = structuredClone(boardViaTentingCircuit)
  const boardA = elements.find(
    (element): element is PcbBoard =>
      element.type === "pcb_board" && element.pcb_board_id === "board_A",
  )!
  const boardB = elements.find(
    (element): element is PcbBoard =>
      element.type === "pcb_board" && element.pcb_board_id === "board_B",
  )!
  boardA.center = boardB.center
  const group = elements.find((element) => element.type === "pcb_group")!
  group.subcircuit_id = undefined
  group.source_group_id = "source_nested_A"
  const nestedGroup: SourceGroup = {
    type: "source_group",
    source_group_id: "source_nested_A",
    parent_source_group_id: "source_child_A",
  }
  const component: PcbComponent = {
    type: "pcb_component",
    pcb_component_id: "component_A",
    source_component_id: "source_component_A",
    pcb_group_id: "group_A",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  }
  const trace = elements.find((element) => element.type === "pcb_trace")!
  trace.pcb_group_id = undefined
  trace.pcb_component_id = component.pcb_component_id
  const unowned: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "unowned",
    x: boardB.center.x,
    y: boardB.center.y,
    outer_diameter: 0.6,
    hole_diameter: 0.3,
    layers: ["top", "bottom"],
  }
  const cycle: SourceGroup = {
    type: "source_group",
    source_group_id: "cycle_group",
    is_subcircuit: true,
    subcircuit_id: "cycle",
    parent_subcircuit_id: "cycle",
  }
  elements.push(unowned, cycle, nestedGroup, component)
  const owners = createBoardOwnerMap(elements)
  expect(owners.get("board_A")).toBe(boardA)
  expect(owners.get("source_child_A")).toBe(boardA)
  expect(owners.get("source_nested_A")).toBe(boardA)
  expect(owners.get("child_A")).toBe(boardA)
  expect(owners.get("group_A")).toBe(boardA)
  expect(owners.get("component_A")).toBe(boardA)
  expect(owners.get("trace_A")).toBe(boardA)
  expect(owners.get("A_inherited")).toBe(boardA)
  expect(owners.get("A_exposed")).toBe(boardA)
  expect(owners.get("A_duplicate")).toBe(boardA)
  expect(owners.get("B_inherited")).toBe(boardB)
  expect(owners.get("B_duplicate")).toBe(boardB)
  expect(owners.get("unowned")).toBeUndefined()
  expect(owners.get("cycle")).toBeUndefined()
  expect(createBoardOwnerMap([...elements].reverse())).toEqual(owners)
  expect(createBoardOwnerMap([boardB, unowned]).get("unowned")).toBe(boardB)
  expect(createBoardOwnerMap([unowned]).get("unowned")).toBeUndefined()
  expect(
    createBoardOwnerMap([boardB, { ...unowned, subcircuit_id: "missing" }]).get(
      "unowned",
    ),
  ).toBeUndefined()
})
