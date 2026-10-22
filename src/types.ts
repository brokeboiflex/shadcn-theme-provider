import type { ThemeMode, ThemeOptions } from "./options"

export type { ThemeMode, ThemeOptions } from "./options"

export type ThemeProviderProps = ThemeOptions & {
  children: React.ReactNode
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
