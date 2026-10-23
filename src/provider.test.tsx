// @vitest-environment jsdom

import { act } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ThemeProvider } from "./provider"

const globals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
globals.IS_REACT_ACT_ENVIRONMENT = true

const themes = { default: "/themes/default.css", ocean: "/themes/ocean.css" }
const app = (
  <ThemeProvider themes={themes} defaultMode="dark">
    <p>content</p>
  </ThemeProvider>
)

let consoleErrors: string[]
beforeEach(() => {
  consoleErrors = []
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(" "))
  })
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  localStorage.clear()
})

it("renders the init script during server rendering", () => {
  const html = renderToString(app)
  expect(html).toContain("<script")
  expect(html).toContain("shadcn-theme-mode")
})

it("hydrates server HTML that contains the init script without errors", async () => {
  const container = document.createElement("div")
  container.innerHTML = renderToString(app)
  document.body.append(container)
  const root = await act(async () => hydrateRoot(container, app))
  expect(consoleErrors).toEqual([])
  expect(container.querySelector("p")?.textContent).toBe("content")
  // The script ran before paint; after hydration it is no longer rendered.
  expect(container.querySelector("script")).toBeNull()
  await act(async () => root.unmount())
})

it("renders no script in a client-only app, so React reports nothing", async () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(app))
  // React never executes a script created on the client, and 19.3 warns
  // about rendering one; client-only apps inline it into index.html instead.
  expect(consoleErrors).toEqual([])
  expect(container.querySelector("script")).toBeNull()
  expect(container.textContent).toBe("content")
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  await act(async () => root.unmount())
})
