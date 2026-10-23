/** Storage is optional: browser policy or a full quota must not break theming. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Keep the current choice in React state when persistence is unavailable.
  }
}
