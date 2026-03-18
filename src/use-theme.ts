import { useContext } from "react"
import { ThemeProviderContext } from "./provider"
import type { ThemeProviderState } from "./types"

export function useTheme(): ThemeProviderState {
  const ctx = useContext(ThemeProviderContext)

  if (ctx === undefined) {
    throw new Error("useTheme must be used within a <ThemeProvider>")
  }

  return ctx
}
