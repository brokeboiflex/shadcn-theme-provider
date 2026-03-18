import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ThemeMode, ThemeProviderProps, ThemeProviderState } from "./types"

const LINK_ATTR = "data-shadcn-palette"
const PALETTE_ATTR = "data-palette"
const SWITCHING_ATTR = "data-switching"

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemMode() : mode
}

export const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  themes,
  defaultMode = "system",
  defaultPalette,
  modeStorageKey = "shadcn-theme-mode",
  paletteStorageKey = "shadcn-theme-palette",
  attribute = "class",
  nonce,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const themeNames = useMemo(() => Object.keys(themes), [themes])
  const fallbackPalette = defaultPalette ?? themeNames[0] ?? "default"

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return defaultMode
    return (localStorage.getItem(modeStorageKey) as ThemeMode | null) ?? defaultMode
  })

  const [palette, setPaletteState] = useState<string>(() => {
    if (typeof window === "undefined") return fallbackPalette
    return localStorage.getItem(paletteStorageKey) ?? fallbackPalette
  })

  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() =>
    resolveMode(mode)
  )

  // Keep a ref to themes so the palette effect doesn't re-run on themes identity changes
  const themesRef = useRef(themes)
  themesRef.current = themes

  // ── Apply mode to <html> ──────────────────────────────────────────
  useEffect(() => {
    const resolved = resolveMode(mode)
    setResolvedMode(resolved)

    const root = document.documentElement
    if (attribute === "class") {
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    } else {
      root.setAttribute("data-mode", resolved)
    }
  }, [mode, attribute])

  // ── Listen for system preference changes ──────────────────────────
  useEffect(() => {
    if (mode !== "system") return

    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light"
      setResolvedMode(resolved)

      const root = document.documentElement
      if (attribute === "class") {
        root.classList.remove("light", "dark")
        root.classList.add(resolved)
      } else {
        root.setAttribute("data-mode", resolved)
      }
    }

    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [mode, attribute])

  // ── Load palette CSS ──────────────────────────────────────────────
  useEffect(() => {
    const currentThemes = themesRef.current
    const href = currentThemes[palette] ?? currentThemes[Object.keys(currentThemes)[0]]
    if (!href) return

    const root = document.documentElement

    // Optionally disable transitions during switch
    if (disableTransitionOnChange) {
      root.setAttribute(SWITCHING_ATTR, "")
    }

    // Remove existing palette links
    document
      .querySelectorAll(`link[${LINK_ATTR}]`)
      .forEach((n) => n.remove())

    // Inject new palette link
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.setAttribute(LINK_ATTR, palette)
    if (nonce) link.nonce = nonce
    document.head.appendChild(link)

    // Expose palette name as data attribute
    root.setAttribute(PALETTE_ATTR, palette)

    // Remove switching attribute after CSS loads (or on next frame as fallback)
    if (disableTransitionOnChange) {
      const cleanup = () => {
        // Use rAF to ensure the browser has applied the new styles
        requestAnimationFrame(() => {
          root.removeAttribute(SWITCHING_ATTR)
        })
      }
      link.addEventListener("load", cleanup, { once: true })
      // Fallback in case load doesn't fire (e.g., cached)
      const timer = setTimeout(cleanup, 100)
      return () => clearTimeout(timer)
    }
  }, [palette, nonce, disableTransitionOnChange])

  // ── Persist to localStorage ───────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(modeStorageKey, mode)
  }, [mode, modeStorageKey])

  useEffect(() => {
    localStorage.setItem(paletteStorageKey, palette)
  }, [palette, paletteStorageKey])

  // ── Stable setters ────────────────────────────────────────────────
  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  const setPalette = useCallback((p: string) => setPaletteState(p), [])

  const value = useMemo<ThemeProviderState>(
    () => ({
      mode,
      setMode,
      palette,
      setPalette,
      resolvedMode,
      themes: themeNames,
    }),
    [mode, setMode, palette, setPalette, resolvedMode, themeNames]
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
