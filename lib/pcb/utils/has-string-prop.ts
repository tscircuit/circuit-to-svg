import type { AnyCircuitElement } from "circuit-json"

export const hasStringProp = <T extends string>(
  elm: AnyCircuitElement,
  prop: T,
): elm is AnyCircuitElement & Record<T, string> =>
  prop in elm && typeof (elm as Record<T, unknown>)[prop] === "string"
