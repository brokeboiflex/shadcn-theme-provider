// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest"
import { getThemeScript } from "./script"

afterEach(() => {
  vi.restoreAllMocks()
  document.head.innerHTML = ""
  document.documentElement.className = ""
  document.documentElement.removeAttribute("data-mode")
  document.documentElement.removeAttribute("data-palette")
  localStorage.clear()
})

it("escapes script delimiters while preserving names, URLs, keys and nonce", () => {
  const name = "palette</script>"
  const href = "/theme.css?label=<value>"
  const storageKey = "stored<palette>"
  localStorage.setItem(storageKey, name)
  const script = getThemeScript({
    themes: { default: "/default.css", [name]: href },
    paletteStorageKey: storageKey,
    defaultMode: "light",
    nonce: "nonce<value>",
  })
  expect(script).not.toContain("</script>")
  new Function(script)()
  const link = document.querySelector<HTMLLinkElement>(
    "link[data-shadcn-palette]"
  )!
  expect(link.getAttribute("data-shadcn-palette")).toBe(name)
  expect(link.getAttribute("href")).toBe(href)
  expect(link.nonce).toBe("nonce<value>")
})

it("reconciles a stale link and reuses the matching link on repeated runs", () => {
  const link = document.createElement("link")
  link.setAttribute("data-shadcn-palette", "removed")
  link.href = "/removed.css"
  document.head.append(link)
  const script = getThemeScript({
    themes: { current: "/current.css" },
    defaultMode: "light",
  })
  new Function(script)()
  const applied = document.querySelector("link[data-shadcn-palette]")
  expect(applied).not.toBe(link)
  expect(applied?.getAttribute("href")).toBe("/current.css")
  new Function(script)()
  expect(document.querySelector("link[data-shadcn-palette]")).toBe(applied)
  expect(document.querySelectorAll("link[data-shadcn-palette]")).toHaveLength(1)
})

it("clears stale palette DOM for an empty themes map", () => {
  new Function(
    getThemeScript({
      themes: { current: "/current.css" },
      defaultMode: "light",
    })
  )()
  new Function(getThemeScript({ themes: {}, defaultMode: "light" }))()
  expect(document.querySelector("link[data-shadcn-palette]")).toBeNull()
  expect(document.documentElement.hasAttribute("data-palette")).toBe(false)
})

it("uses data-mode without leaving a conflicting mode class", () => {
  document.documentElement.className = "dark host-class"
  new Function(
    getThemeScript({ themes: {}, defaultMode: "light", attribute: "data-mode" })
  )()
  expect(document.documentElement.className).toBe("host-class")
  expect(document.documentElement.getAttribute("data-mode")).toBe("light")
})

it("applies defaults even when accessing localStorage itself throws", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError")
  })
  new Function(
    getThemeScript({ themes: { current: "/current.css" }, defaultMode: "dark" })
  )()
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  expect(document.documentElement.getAttribute("data-palette")).toBe("current")
})
