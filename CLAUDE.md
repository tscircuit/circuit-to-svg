# CLAUDE.md - Circuit-to-SVG

## Build/Lint/Test Commands
- Build: `npm run build` or `bun run build` (tsup-node ./lib/index.ts --format esm --dts --sourcemap)
- Format: `npm run format` or `bun run format` (biome format . --write)
- Format check: `npm run format:check` (biome format .)
- Type check: `npx tsc --noEmit`
- Run single test: `bun test tests/path/to/test.test.ts`
- Run all tests: `bun test`
- Start Storybook: `npm run start` (storybook dev -p 6006)

## Code Style Guidelines
- **Typescript**: Strict mode with noUncheckedIndexedAccess and noImplicitOverride
- **Formatting**: Biome with 2-space indentation
- **Imports**: Organized automatically with biome organizeImports
- **Naming**: kebab-case for filenames (enforced by biome)
- **JSX**: Double quotes for JSX attributes
- **Semicolons**: As needed (not enforced)
- **Commas**: Trailing commas in all multi-line structures
- **Error handling**: Prefer specific error types, avoid silent failures
- **SVG handling**: Use svgson for SVG manipulation
- **Types**: Import types from "circuit-json", avoid `any` when possible
- **Testing**: Use bun:test with toMatchSvgSnapshot for visual regression tests