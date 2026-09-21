// Registry packages contain dist. Build source-only Git installs in a temporary
// project: bundlers deliberately ignore tsconfig path aliases in node_modules.
const {
  existsSync,
  mkdtempSync,
  cpSync,
  symlinkSync,
  rmSync,
} = require("node:fs")
const { execFileSync } = require("node:child_process")
const { join } = require("node:path")
const { tmpdir } = require("node:os")
if (!existsSync("dist/index.js")) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm"
  const runOptions = { stdio: "inherit", shell: process.platform === "win32" }
  if (!existsSync("node_modules/.bin/tsup-node")) {
    execFileSync(
      npm,
      ["install", "--include=dev", "--ignore-scripts", "--no-package-lock"],
      runOptions,
    )
  }
  const root = process.cwd()
  const buildDir = mkdtempSync(join(tmpdir(), "circuit-to-svg-build-"))
  try {
    for (const file of ["lib", "package.json", "tsconfig.json"])
      cpSync(join(root, file), join(buildDir, file), { recursive: true })
    symlinkSync(
      join(root, "node_modules"),
      join(buildDir, "node_modules"),
      "junction",
    )
    execFileSync(npm, ["run", "build"], { ...runOptions, cwd: buildDir })
    cpSync(join(buildDir, "dist"), join(root, "dist"), { recursive: true })
  } finally {
    rmSync(buildDir, { recursive: true, force: true })
  }
}
