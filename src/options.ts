// React-free on purpose: shared by <ThemeProvider> and the
// `shadcn-theme-provider/script` entry, which build tools (e.g. a Vite
// config) import without pulling React in.

export type ThemeMode = "dark" | "light" | "system"

/** Options shared by `<ThemeProvider>` and `getThemeScript()`. */
export type ThemeOptions = {
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
}

export type ResolvedThemeOptions = Required<Omit<ThemeOptions, "nonce">> &
  Pick<ThemeOptions, "nonce">

/** The single source of truth for option defaults. */
export function resolveThemeOptions({
  themes,
  defaultMode = "system",
  defaultPalette,
  modeStorageKey = "shadcn-theme-mode",
  paletteStorageKey = "shadcn-theme-palette",
  attribute = "class",
  nonce,
}: ThemeOptions): ResolvedThemeOptions {
  return {
    themes,
    defaultMode,
    defaultPalette: defaultPalette ?? Object.keys(themes)[0] ?? "default",
    modeStorageKey,
    paletteStorageKey,
    attribute,
    nonce,
  }
}
