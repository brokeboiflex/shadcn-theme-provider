// @vitest-environment jsdom

import { act, StrictMode } from "react"
import { createRoot, hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ThemeProvider } from "./provider"
import { getThemeScript } from "./script"
import type { ThemeProviderProps, ThemeProviderState } from "./types"
import { useTheme } from "./use-theme"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const themes = { first: "/first.css", preferred: "/preferred.css" }
const options = {
  themes,
  defaultPalette: "preferred",
  defaultMode: "light" as const,
}
const roots: Root[] = []

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  document.documentElement.className = ""
  for (const name of ["data-mode", "data-palette", "data-switching"])
    document.documentElement.removeAttribute(name)
  localStorage.clear()
})

function link() {
  return document.querySelector<HTMLLinkElement>("link[data-shadcn-palette]")
}

async function mount(
  initial: Partial<ThemeProviderProps> = {},
  strict = false
) {
  let state: ThemeProviderState
  function Probe() {
    state = useTheme()
    return (
      <span>
        {state.mode}/{state.palette}/{state.resolvedMode}
      </span>
    )
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = async (next = initial) => {
    const app = (
      <ThemeProvider {...options} {...next}>
        <Probe />
      </ThemeProvider>
    )
    await act(async () =>
      root.render(strict ? <StrictMode>{app}</StrictMode> : app)
    )
  }
  await render()
  return { state: () => state!, render, root, container }
}

it("uses the configured default even when it is not the first palette", async () => {
  localStorage.setItem("shadcn-theme-palette", "removed")
  new Function(getThemeScript(options))()
  const initialLink = link()
  const view = await mount()
  expect(view.state().palette).toBe("preferred")
  expect(link()).toBe(initialLink)
  expect(link()?.getAttribute("href")).toBe("/preferred.css")
})

it("continues with defaults when storage reads are denied", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError")
  })
  new Function(getThemeScript(options))()
  const view = await mount()
  expect(view.state().palette).toBe("preferred")
  await act(async () => view.state().setPalette("first"))
  expect(view.state().palette).toBe("first")
})

it("keeps switching themes when storage writes fail", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError")
  })
  const view = await mount()
  await act(async () => {
    view.state().setPalette("first")
    view.state().setMode("dark")
  })
  expect(view.state().palette).toBe("first")
  expect(document.documentElement.classList.contains("dark")).toBe(true)
})

it("updates the stylesheet when the current palette URL changes", async () => {
  const view = await mount()
  await view.render({ themes: { ...themes, preferred: "/preferred-v2.css" } })
  expect(link()?.getAttribute("href")).toBe("/preferred-v2.css")
  expect(document.querySelectorAll("link[data-shadcn-palette]")).toHaveLength(1)
})

it("does not replace the stylesheet for an equivalent themes object", async () => {
  const view = await mount()
  const initialLink = link()
  await view.render({ themes: { ...themes } })
  expect(link()).toBe(initialLink)
})

it("updates the link nonce when it changes", async () => {
  const view = await mount({ nonce: "first-nonce" })
  await view.render({ nonce: "next-nonce" })
  expect(link()?.nonce).toBe("next-nonce")
})

it("cleans up the old mode attribute when switching attribute strategies", async () => {
  const view = await mount({ defaultMode: "dark" })
  await act(async () => view.state().setMode("light"))
  await view.render({ attribute: "data-mode" })
  expect(document.documentElement.classList.contains("dark")).toBe(false)
  expect(document.documentElement.getAttribute("data-mode")).toBe("light")
  await view.render({ attribute: "class" })
  expect(document.documentElement.hasAttribute("data-mode")).toBe(false)
})

it("keeps initial choices when default props change", async () => {
  const view = await mount()
  await view.render({ defaultMode: "dark", defaultPalette: "first" })
  expect(view.state().mode).toBe("light")
  expect(view.state().palette).toBe("preferred")
})

it("does not resurrect a removed choice when its name is reintroduced", async () => {
  localStorage.setItem("shadcn-theme-palette", "first")
  const view = await mount()
  await view.render({ themes: { preferred: themes.preferred } })
  expect(view.state().palette).toBe("preferred")
  await view.render({ themes })
  expect(view.state().palette).toBe("preferred")
})

it("tracks system changes and removes its media listener on unmount", async () => {
  let dark = false
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return dark
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }))
  const view = await mount({ defaultMode: "system" })
  expect(view.state().resolvedMode).toBe("light")
  await act(async () => {
    dark = true
    for (const listener of listeners) listener()
  })
  expect(view.state().mode).toBe("system")
  expect(view.state().resolvedMode).toBe("dark")
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  await act(async () => view.state().setMode("light"))
  expect(listeners.size).toBe(0)
  await act(async () => view.state().setMode("system"))
  expect(listeners.size).toBe(1)
  await act(async () => view.root.unmount())
  roots.splice(roots.indexOf(view.root), 1)
  expect(listeners.size).toBe(0)
})

it.each([
  { stored: "removed", fallback: "preferred", expected: "preferred" },
  { stored: "constructor", fallback: "preferred", expected: "preferred" },
  { stored: "__proto__", fallback: "preferred", expected: "preferred" },
  { stored: "removed", fallback: "missing", expected: "first" },
  { stored: "first", fallback: "preferred", expected: "first" },
])(
  "keeps script and provider consistent for $stored with default $fallback",
  async ({ stored, fallback, expected }) => {
    localStorage.setItem("shadcn-theme-palette", stored)
    new Function(getThemeScript({ ...options, defaultPalette: fallback }))()
    const initialLink = link()
    expect(initialLink?.getAttribute("data-shadcn-palette")).toBe(expected)
    const view = await mount({ defaultPalette: fallback })
    expect(view.state().palette).toBe(expected)
    expect(link()).toBe(initialLink)
  }
)

it("clears the old stylesheet when all palettes are removed", async () => {
  const view = await mount()
  await view.render({ themes: {} })
  expect(link()).toBeNull()
  expect(document.documentElement.hasAttribute("data-palette")).toBe(false)
  expect(view.state().palette).toBe("")
})

it("hydrates theme-dependent children without overwriting the stored preference", async () => {
  function Probe() {
    const state = useTheme()
    return (
      <span>
        {state.mode}/{state.palette}/{state.resolvedMode}
      </span>
    )
  }
  const app = (
    <ThemeProvider {...options}>
      <Probe />
    </ThemeProvider>
  )
  vi.stubGlobal("window", undefined)
  const html = renderToString(app)
  vi.unstubAllGlobals()
  localStorage.setItem("shadcn-theme-mode", "dark")
  localStorage.setItem("shadcn-theme-palette", "first")
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.append(container)
  const serverSpan = container.querySelector("span")
  new Function(getThemeScript(options))()
  const initialLink = link()
  const write = vi.spyOn(Storage.prototype, "setItem")
  const errors: unknown[] = []
  await act(async () => {
    roots.push(
      hydrateRoot(container, app, {
        onRecoverableError: (error) => errors.push(error),
      })
    )
  })
  expect(errors).toEqual([])
  expect(container.querySelector("span")).toBe(serverSpan)
  expect(container.textContent).toBe("dark/first/dark")
  expect(link()).toBe(initialLink)
  expect(write).not.toHaveBeenCalledWith("shadcn-theme-palette", "preferred")
  expect(write).not.toHaveBeenCalledWith("shadcn-theme-mode", "light")
})

it("removes the switching marker when transition suppression is turned off", async () => {
  const view = await mount({ disableTransitionOnChange: true })
  expect(document.documentElement.hasAttribute("data-switching")).toBe(true)
  await view.render({ disableTransitionOnChange: false })
  expect(document.documentElement.hasAttribute("data-switching")).toBe(false)
})

it("cancels transition callbacks owned by a previous palette", async () => {
  vi.useFakeTimers()
  let frame = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frame, callback)
    return frame
  })
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
  const view = await mount({ disableTransitionOnChange: true })
  const oldLink = link()!
  oldLink.dispatchEvent(new Event("load"))
  await act(async () => view.state().setPalette("first"))
  oldLink.dispatchEvent(new Event("load"))
  for (const callback of frames.values()) callback(0)
  frames.clear()
  expect(document.documentElement.hasAttribute("data-switching")).toBe(true)
  link()!.dispatchEvent(new Event("load"))
  for (const callback of frames.values()) callback(0)
  frames.clear()
  expect(document.documentElement.hasAttribute("data-switching")).toBe(false)
})

it("does not leave transitions disabled after Strict Mode effect replay", async () => {
  vi.useFakeTimers()
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 1)
  )
  vi.stubGlobal("cancelAnimationFrame", clearTimeout)
  await mount({ disableTransitionOnChange: true }, true)
  await act(async () => vi.runAllTimers())
  expect(document.documentElement.hasAttribute("data-switching")).toBe(false)
})
