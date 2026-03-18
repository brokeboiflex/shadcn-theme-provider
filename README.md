# shadcn-theme-provider

Dual-axis theme provider for [shadcn/ui](https://ui.shadcn.com) — **mode** (light/dark/system) + **palette** (runtime CSS switching).

- Handles both dark mode and color palette switching independently
- Runtime CSS injection — no build step needed for new palettes
- Ships a Tailwind v4 token bridge CSS file
- SSR-safe, zero runtime dependencies (React peer dep only)
- System preference listener for live dark mode updates
- CSP nonce support for injected stylesheets

## Install

```bash
npm install shadcn-theme-provider
```

## Quick Start

### 1. Wrap your app

```tsx
import { ThemeProvider } from "shadcn-theme-provider"

const themes = {
  default: "/themes/default.css",
  corporate: "/themes/corporate.css",
  marshmallow: "/themes/marshmallow.css",
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes} defaultMode="system" defaultPalette="default">
    <App />
  </ThemeProvider>
)
```

### 2. Import the Tailwind bridge

```css
/* index.css */
@import "tailwindcss";
@import "shadcn-theme-provider/tailwind.css";
```

### 3. Use the hook

```tsx
import { useTheme } from "shadcn-theme-provider"

function ThemeSwitcher() {
  const { mode, setMode, palette, setPalette, themes, resolvedMode } = useTheme()

  return (
    <>
      <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <select value={palette} onChange={(e) => setPalette(e.target.value)}>
        {themes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </>
  )
}
```

## Palette CSS Files

Each palette is a CSS file that defines shadcn CSS variables for both light and dark modes:

```css
/* /themes/default.css */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... all shadcn variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  /* ... */
}
```

Use the [shadcn themes page](https://ui.shadcn.com/themes) or [tweakcn](https://tweakcn.com) to generate palette files.

## API

### `<ThemeProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `themes` | `Record<string, string>` | *required* | Map of palette names to CSS file URLs |
| `defaultMode` | `"light" \| "dark" \| "system"` | `"system"` | Initial mode |
| `defaultPalette` | `string` | First key in `themes` | Initial palette |
| `modeStorageKey` | `string` | `"shadcn-theme-mode"` | localStorage key for mode |
| `paletteStorageKey` | `string` | `"shadcn-theme-palette"` | localStorage key for palette |
| `attribute` | `"class" \| "data-mode"` | `"class"` | How mode is applied to `<html>` |
| `nonce` | `string` | — | CSP nonce for injected `<link>` tags |
| `disableTransitionOnChange` | `boolean` | `false` | Add `[data-switching]` during palette swap |

### `useTheme()`

```ts
const {
  mode,          // current ThemeMode ("light" | "dark" | "system")
  setMode,       // (mode: ThemeMode) => void
  palette,       // current palette name
  setPalette,    // (palette: string) => void
  resolvedMode,  // always "light" | "dark" (resolves "system")
  themes,        // string[] — available palette names
} = useTheme()
```

### Disabling transitions on palette switch

When `disableTransitionOnChange` is enabled, the provider adds `[data-switching]` to `<html>` during palette changes. Use it in CSS:

```css
[data-switching] * {
  transition: none !important;
}
```

## Tailwind v4 Bridge

The `shadcn-theme-provider/tailwind.css` file maps shadcn CSS variables (`--primary`, `--background`, etc.) to Tailwind v4 theme tokens (`--color-primary`, `--color-background`, etc.) so you can use `bg-primary`, `text-foreground`, etc. in your markup.

It also includes `@custom-variant dark (&:is(.dark *))` for proper dark mode support with class-based switching.

## License

MIT
