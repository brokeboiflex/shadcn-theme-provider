// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ThemeProvider } from "./provider"
import { getThemeScript } from "./script"
import type { ThemeProviderState } from "./types"
import { useTheme } from "./use-theme"

const globals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
globals.IS_REACT_ACT_ENVIRONMENT = true

const themes = { default: "/themes/default.css", ocean: "/themes/ocean.css" }
const options = { themes, defaultMode: "light" as const }

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
})

afterEach(() => {
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  document.documentElement.className = ""
  document.documentElement.removeAttribute("data-palette")
  localStorage.clear()
})

function paletteLinks() {
  return [...document.querySelectorAll("link[data-shadcn-palette]")].map(
    (link) =>
      `${link.getAttribute("data-shadcn-palette")}=${link.getAttribute("href")}`
  )
}

async function mount(props: { themes?: Record<string, string> } = {}) {
  let state: ThemeProviderState | undefined
  function Probe() {
    state = useTheme()
    return null
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const render = (next = props) =>
    act(async () =>
      root.render(
        <ThemeProvider {...options} {...next}>
          <Probe />
        </ThemeProvider>
      )
    )
  await render()
  return {
    state: () => state!,
    render,
    unmount: () => act(async () => root.unmount()),
  }
}

function runInitScript(scriptOptions = options) {
  new Function(getThemeScript(scriptOptions))()
}

it("falls back to the default palette when the stored one no longer exists", async () => {
  localStorage.setItem("shadcn-theme-palette", "removed-palette")
  const view = await mount()
  expect(view.state().palette).toBe("default")
  expect(document.documentElement.getAttribute("data-palette")).toBe("default")
  expect(paletteLinks()).toEqual(["default=/themes/default.css"])
  expect(localStorage.getItem("shadcn-theme-palette")).toBe("default")
  await view.unmount()
})

it("never treats inherited object keys as palettes", async () => {
  localStorage.setItem("shadcn-theme-palette", "constructor")
  runInitScript()
  expect(paletteLinks()).toEqual(["default=/themes/default.css"])
  const view = await mount()
  expect(view.state().palette).toBe("default")
  await view.unmount()
})

it("agrees with the init script, so the provider keeps the script's link", async () => {
  localStorage.setItem("shadcn-theme-palette", "removed-palette")
  runInitScript()
  const injected = document.querySelector("link[data-shadcn-palette]")
  const view = await mount()
  expect(paletteLinks()).toEqual(["default=/themes/default.css"])
  expect(document.querySelector("link[data-shadcn-palette]")).toBe(injected)
  await view.unmount()
})

it("falls back when the active palette is removed from themes", async () => {
  localStorage.setItem("shadcn-theme-palette", "ocean")
  const view = await mount()
  expect(view.state().palette).toBe("ocean")
  await view.render({ themes: { default: themes.default } })
  expect(view.state().palette).toBe("default")
  expect(paletteLinks()).toEqual(["default=/themes/default.css"])
  await view.unmount()
})

it("ignores a palette name passed to setPalette that is not in themes", async () => {
  localStorage.setItem("shadcn-theme-palette", "ocean")
  const view = await mount()
  await act(async () => view.state().setPalette("missing"))
  expect(view.state().palette).toBe("ocean")
  expect(paletteLinks()).toEqual(["ocean=/themes/ocean.css"])
  await view.unmount()
})

it("falls back to the default mode when the stored mode is invalid", async () => {
  localStorage.setItem("shadcn-theme-mode", "blue")
  runInitScript()
  expect(document.documentElement.className).toBe("light")
  const view = await mount()
  expect(view.state().mode).toBe("light")
  expect(document.documentElement.className).toBe("light")
  await view.unmount()
})
