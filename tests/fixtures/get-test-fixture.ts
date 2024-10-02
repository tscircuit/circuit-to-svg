import { Circuit } from "@tscircuit/core"

export const getTestFixture = () => {
  const project = new Circuit()

  return {
    project,
    circuit: project,
  }
}
