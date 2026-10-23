import {
  createContext,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import type { ThemeMode, ThemeProviderProps, ThemeProviderState } from "./types"
import {
  hasPalette,
  resolveThemeOptions,
  toPalette,
  toThemeMode,
} from "./options"
import type { ResolvedThemeOptions } from "./options"
import { getThemeScript } from "./script"
import { readStorage, writeStorage } from "./storage"

const LINK_ATTR = "data-shadcn-palette"
const PALETTE_ATTR = "data-palette"
const SWITCHING_ATTR = "data-switching"

// ── Pre-hydration init script (no-FOUC for SSR) ─────────────────────
// Applies the persisted mode + palette before first paint. It renders only
// during SSR and the hydration pass (matching the server HTML, no mismatch),
// then unmounts once hydration settles on the client snapshot. Memoized on the
// *stable* config props — NOT the provider's mode/palette state — so a theme
// change during hydration never re-renders it. Rendering a <script> on the
// client triggers React's "scripts inside React components are never executed
// when rendering on the client" warning, and the script would not run anyway.
const ThemeScript = memo(function ThemeScript({
  themes,
  defaultMode,
  defaultPalette,
  modeStorageKey,
  paletteStorageKey,
  attribute,
  nonce,
}: ResolvedThemeOptions) {
  const initScript = useMemo(
    () =>
      getThemeScript({
        themes,
        defaultMode,
        defaultPalette,
        modeStorageKey,
        paletteStorageKey,
        attribute,
        nonce,
      }),
    [
      themes,
      defaultMode,
      defaultPalette,
      modeStorageKey,
      paletteStorageKey,
      attribute,
      nonce,
    ]
  )

  return (
    <script
      suppressHydrationWarning
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  )
})

// React renders the server snapshot during server rendering and hydration,
// and the client snapshot for a client-only render (and right after hydration).
const subscribeToNothing = () => () => {}
const isClientRender = () => false
const isServerRender = () => true

/**
 * True while React renders on the server or hydrates server HTML. The init
 * script is useful only there: a script React creates on the client never
 * executes, and React 19.3+ reports rendering one. Client-only apps inline the
 * same script into index.html through `shadcn-theme-provider/script`.
 */
function useServerRender() {
  return useSyncExternalStore(
    subscribeToNothing,
    isClientRender,
    isServerRender
  )
}

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function subscribeToSystemMode(onChange: () => void) {
  if (!window.matchMedia) return () => {}
  const mql = window.matchMedia("(prefers-color-scheme: dark)")
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getServerSystemMode = () => "light" as const

export const ThemeProviderContext = createContext<
  ThemeProviderState | undefined
>(undefined)

export function ThemeProvider({
  children,
  disableTransitionOnChange = false,
  ...options
}: ThemeProviderProps) {
  const {
    themes,
    defaultMode,
    defaultPalette: fallbackPalette,
    modeStorageKey,
    paletteStorageKey,
    attribute,
    nonce,
  } = resolveThemeOptions(options)
  const themeNames = useMemo(() => Object.keys(themes), [themes])
  const serverRender = useServerRender()

  const [storedMode, setModeState] = useState(() =>
    toThemeMode(readStorage(modeStorageKey), defaultMode)
  )
  // An invalid stored mode falls back to the default, as in the init script.
  // Hydration must first expose the same values as the server render.
  const mode = toThemeMode(serverRender ? null : storedMode, defaultMode)

  const [storedPalette, setPaletteState] = useState(() =>
    toPalette(themes, readStorage(paletteStorageKey), fallbackPalette)
  )
  // A stored palette may have been renamed or removed since, and `themes` can
  // change while mounted; both fall back as the init script does.
  const palette = toPalette(
    themes,
    serverRender ? null : storedPalette,
    fallbackPalette
  )
  const href = hasPalette(themes, palette) ? themes[palette] : undefined

  const systemMode = useSyncExternalStore(
    mode === "system" ? subscribeToSystemMode : subscribeToNothing,
    getSystemMode,
    getServerSystemMode
  )
  const resolvedMode = mode === "system" ? systemMode : mode

  // The setter stays stable while validating against the latest palette map.
  const themesRef = useRef(themes)
  themesRef.current = themes

  // ── Apply mode to <html> ──────────────────────────────────────────
  useEffect(() => {
    // Do not overwrite the init script's stored choice during hydration.
    if (serverRender) return

    const root = document.documentElement
    if (attribute === "class") {
      root.removeAttribute("data-mode")
      root.classList.remove("light", "dark")
      root.classList.add(resolvedMode)
    } else {
      root.classList.remove("light", "dark")
      root.setAttribute("data-mode", resolvedMode)
    }
  }, [resolvedMode, attribute, serverRender])

  // ── Load palette CSS ──────────────────────────────────────────────
  useEffect(() => {
    if (serverRender) return

    const root = document.documentElement
    if (!href) {
      document
        .querySelectorAll(`link[${LINK_ATTR}]`)
        .forEach((link) => link.remove())
      root.removeAttribute(PALETTE_ATTR)
      return
    }

    // Skip if this palette is already applied (e.g. by the pre-hydration
    // init script) — removing and re-adding the link would cause a flash
    const existing = document.querySelector<HTMLLinkElement>(
      `link[${LINK_ATTR}]`
    )
    if (
      existing &&
      existing.getAttribute(LINK_ATTR) === palette &&
      existing.getAttribute("href") === href &&
      existing.nonce === (nonce ?? "")
    ) {
      root.setAttribute(PALETTE_ATTR, palette)
      return
    }

    // Optionally disable transitions during switch
    if (disableTransitionOnChange) {
      root.setAttribute(SWITCHING_ATTR, "")
    }

    // Remove existing palette links
    document.querySelectorAll(`link[${LINK_ATTR}]`).forEach((n) => n.remove())

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
      let disposed = false
      let frame: number | undefined
      const finish = () => {
        if (disposed || frame !== undefined) return
        // Use rAF to ensure the browser has applied the new styles
        frame = requestAnimationFrame(() => {
          if (!disposed) root.removeAttribute(SWITCHING_ATTR)
        })
      }
      link.addEventListener("load", finish, { once: true })
      link.addEventListener("error", finish, { once: true })
      // Fallback in case load doesn't fire (e.g., cached)
      const timer = setTimeout(finish, 100)
      return () => {
        disposed = true
        clearTimeout(timer)
        if (frame !== undefined) cancelAnimationFrame(frame)
        link.removeEventListener("load", finish)
        link.removeEventListener("error", finish)
        root.removeAttribute(SWITCHING_ATTR)
      }
    }
  }, [palette, href, nonce, disableTransitionOnChange, serverRender])

  // ── Persist to localStorage ───────────────────────────────────────
  useEffect(() => {
    if (!serverRender) writeStorage(modeStorageKey, mode)
  }, [mode, modeStorageKey, serverRender])

  useEffect(() => {
    if (serverRender) return
    // Retire a removed choice so reintroducing its name cannot resurrect it.
    setPaletteState(palette)
    writeStorage(paletteStorageKey, palette)
  }, [palette, paletteStorageKey, serverRender])

  // ── Stable setters ────────────────────────────────────────────────
  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  // Unknown names are ignored, so the active palette always exists in `themes`.
  const setPalette = useCallback((p: string) => {
    if (hasPalette(themesRef.current, p)) setPaletteState(p)
  }, [])

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
      {serverRender && (
        <ThemeScript
          themes={themes}
          defaultMode={defaultMode}
          defaultPalette={fallbackPalette}
          modeStorageKey={modeStorageKey}
          paletteStorageKey={paletteStorageKey}
          attribute={attribute}
          nonce={nonce}
        />
      )}
      {children}
    </ThemeProviderContext.Provider>
  )
}
