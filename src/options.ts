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

const THEME_MODES: readonly string[] = ["light", "dark", "system"]

/** `value` when it is a valid mode, otherwise `fallback`. */
export function toThemeMode(
  value: string | null | undefined,
  fallback: ThemeMode
): ThemeMode {
  return value != null && THEME_MODES.includes(value)
    ? (value as ThemeMode)
    : fallback
}

/** Whether `name` is one of `themes` (own keys only, never inherited ones). */
export function hasPalette(
  themes: Record<string, string>,
  name: string | null | undefined
): name is string {
  return name != null && Object.prototype.hasOwnProperty.call(themes, name)
}

/**
 * `value` when it names one of `themes`; otherwise `fallback`, then the first
 * theme. A stored palette can outlive a palette the app has since renamed or
 * removed. The init script applies the same rule, so both always agree.
 */
export function toPalette(
  themes: Record<string, string>,
  value: string | null | undefined,
  fallback: string
): string {
  if (hasPalette(themes, value)) return value
  if (hasPalette(themes, fallback)) return fallback
  return Object.keys(themes)[0] ?? ""
}
