export type ThemeMode = "dark" | "light" | "system"

export type ThemeProviderProps = {
  children: React.ReactNode
  /** Map of palette names to CSS file URLs, e.g. { default: "/themes/default.css" } */
  themes: Record<string, string>
  /** Initial mode. Default: "system" */
  defaultMode?: ThemeMode
  /** Initial palette name. Default: first key in `themes` */
  defaultPalette?: string
  /** localStorage key for mode. Default: "shadcn-theme-mode" */
  modeStorageKey?: string
  /** localStorage key for palette. Default: "shadcn-theme-palette" */
  paletteStorageKey?: string
  /** How mode is applied to `<html>`. Default: "class" */
  attribute?: "class" | "data-mode"
  /** CSP nonce for injected `<link>` tags */
  nonce?: string
  /** Temporarily disable CSS transitions during palette switch */
  disableTransitionOnChange?: boolean
}

export type ThemeProviderState = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  palette: string
  setPalette: (palette: string) => void
  /** The resolved mode — always "light" or "dark" (never "system") */
  resolvedMode: "light" | "dark"
  /** Available palette names from the `themes` prop */
  themes: string[]
}
