// Registry packages already contain dist; Git installs need the build tools.
const { existsSync } = require("node:fs")
const { execFileSync } = require("node:child_process")
if (!existsSync("dist/index.js")) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm"
  if (!existsSync("node_modules/.bin/tsup-node")) {
    execFileSync(
      npm,
      ["install", "--include=dev", "--ignore-scripts", "--no-package-lock"],
      { stdio: "inherit", shell: process.platform === "win32" },
    )
  }
  execFileSync(npm, ["run", "build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  })
}
