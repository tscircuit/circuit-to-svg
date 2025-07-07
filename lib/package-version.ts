import pkg from "../package.json" with { type: "json" }

export const CIRCUIT_TO_SVG_VERSION = (pkg as { version: string }).version
