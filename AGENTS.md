# Agent instructions

## Visual snapshot tests

- Always include a visual SVG snapshot test for changes in circuit-to-svg.
  Visual snapshots are the primary test and the most important evidence that
  rendering behaves correctly. String, markup, and numeric assertions do not
  replace a visual snapshot.
- Use `expect(svg).toMatchSvgSnapshot(import.meta.path)` from the existing
  `bun-match-svg` test setup. Use descriptive snapshot names when testing
  multiple visual states.
- Make the fixture clearly demonstrate the behavior being changed. For
  warnings, show the warning callout and its target; include snapshots for
  relevant visibility and sheet-selection states.
- Generate or update snapshots with
  `BUN_UPDATE_SNAPSHOTS=1 bun test <test-file>`, inspect the rendered images,
  and rerun the test without updating snapshots before submitting changes.
- Commit the `.snap.svg` files alongside the test.
