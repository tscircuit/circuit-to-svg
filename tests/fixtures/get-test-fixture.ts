import { Circuit } from "@tscircuit/core"

export const getTestFixture = () => {
  const circuit = new Circuit()

  return {
    circuit,
  }
}
