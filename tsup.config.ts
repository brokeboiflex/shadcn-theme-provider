import { rm } from "node:fs/promises"
import { defineConfig, type Options } from "tsup"

const shared: Options = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  splitting: false,
  external: ["react", "react-dom"],
  treeshake: true,
}

export default defineConfig(async () => {
  // Configurations build concurrently: clean once before either starts.
  await rm("dist", { recursive: true, force: true })
  return [
    {
      ...shared,
      entry: { index: "src/index.ts" },
      // Esbuild preserves the entry's directive; the extra Rollup pass strips it.
      treeshake: false,
    },
    {
      ...shared,
      // Callable from server code and build tools; never mark this as client.
      entry: { script: "src/script.ts" },
    },
  ]
})
