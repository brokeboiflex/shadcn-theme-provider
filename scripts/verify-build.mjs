import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"

const require = createRequire(import.meta.url)
for (const extension of ["js", "cjs"]) {
  const reactEntry = await readFile(
    new URL(`../dist/index.${extension}`, import.meta.url),
    "utf8"
  )
  const scriptEntry = await readFile(
    new URL(`../dist/script.${extension}`, import.meta.url),
    "utf8"
  )
  assert.match(reactEntry, /^(?:["']use strict["'];\s*)?["']use client["'];/)
  assert.doesNotMatch(scriptEntry, /["']use client["']/)
  assert.doesNotMatch(scriptEntry, /(?:from\s*|require\()["']react(?:[/'"])/)
}

for (const entry of [
  await import("../dist/index.js"),
  require("../dist/index.cjs"),
]) {
  assert.equal(typeof entry.ThemeProvider, "function")
  assert.equal(typeof entry.useTheme, "function")
}
for (const entry of [
  await import("../dist/script.js"),
  require("../dist/script.cjs"),
]) {
  assert.equal(typeof entry.getThemeScript({ themes: {} }), "string")
}

// A server import must not require React's client APIs or a browser global.
execFileSync(process.execPath, [
  "--conditions=react-server",
  "--input-type=module",
  "-e",
  `import { getThemeScript } from ${JSON.stringify(new URL("../dist/script.js", import.meta.url).href)}; getThemeScript({ themes: {} })`,
])
console.log(
  "Package entrypoints, client directives, and server script import verified."
)
