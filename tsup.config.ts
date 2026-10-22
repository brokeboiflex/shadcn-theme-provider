import { defineConfig } from "tsup"

export default defineConfig({
  // "script" is React-free so build tools (e.g. vite.config.ts) can import it
  entry: { index: "src/index.ts", script: "src/script.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
})
