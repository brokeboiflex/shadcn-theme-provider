# shadcn-theme-provider

Dual-axis theme provider for [shadcn/ui](https://ui.shadcn.com) — **mode** (light/dark/system) + **palette** (runtime CSS switching).

**[Live Demo](https://brokeboiflex.github.io/shadcn-theme-provider-demo/)**

- Handles both dark mode and color palette switching independently
- Runtime CSS injection — no build step needed for new palettes
- Ships a Tailwind v4 token bridge CSS file
- SSR/Next.js no-FOUC support — a pre-hydration inline script applies the persisted mode + palette before first paint
- Zero runtime dependencies (React peer dep only)
- System preference listener for live dark mode updates
- CSP nonce support for injected stylesheets and the init script

## Install

```bash
npm install shadcn-theme-provider
```

## Quick Start

### 1. Wrap your app

```tsx
import { ThemeProvider } from "shadcn-theme-provider";

const themes = {
  default: "/themes/default.css",
  corporate: "/themes/corporate.css",
  marshmallow: "/themes/marshmallow.css",
};

createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes} defaultMode="system" defaultPalette="default">
    <App />
  </ThemeProvider>,
);
```

### 2. Import the Tailwind bridge

```css
/* index.css */
@import "tailwindcss";
@import "shadcn-theme-provider/tailwind.css";
```

### 3. Use the hook

```tsx
import { useTheme } from "shadcn-theme-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function ThemeSwitcher() {
  const { mode, setMode, palette, setPalette, themes } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>Mode</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Palette</Label>
        <Select value={palette} onValueChange={setPalette}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

## Next.js / SSR — no flash of unthemed content

Effects only run after hydration, so a naive client-side provider leaves
server-rendered HTML unthemed until JavaScript loads — a visible flash of
wrong colors (FOUC).

`<ThemeProvider>` prevents this by rendering a tiny inline `<script>` that
runs **before first paint**: it reads the persisted mode and palette from
`localStorage`, applies the `.dark`/`.light` class (or `data-mode`
attribute) to `<html>`, and injects the palette stylesheet `<link>`. The
provider's own effects detect the already-applied state and skip
re-injection, so nothing flickers on hydration.

The only setup needed: add `suppressHydrationWarning` to `<html>`, since
the script updates its class/attributes before React hydrates (same
requirement as next-themes):

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider themes={themes} defaultMode="light" defaultPalette="default">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

> The script's content is built exclusively from the props you pass
> (`themes`, storage keys, defaults) — serialized with `JSON.stringify`
> and `<`-escaped. Don't feed it untrusted user input. For strict CSP,
> pass a `nonce` — it's applied to the init script and injected links.

## Palette CSS Files

Each palette is just a `.css` file with shadcn CSS variables for `:root` (light) and `.dark`. **You don't need to write these by hand** — copy-paste them directly from the tools you already use:

### From [tweakcn](https://tweakcn.com) (recommended)

1. Open tweakcn, customize your theme visually
2. Click **Export** → **CSS Variables**
3. Save as e.g. `public/themes/ocean.css`
4. Register it: `{ ocean: "/themes/ocean.css" }`

That's it. Every theme tweakcn exports is a drop-in palette file.

### From [shadcn/ui themes](https://ui.shadcn.com/themes)

1. Pick a theme on the shadcn themes page
2. Click **Copy code**
3. Paste into a new `.css` file in your `public/themes/` folder

### File format

The CSS file just defines variables under `:root` and `.dark` — the same format shadcn and tweakcn already output:

```css
/* public/themes/ocean.css */
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

Adding a new palette to your app is as simple as dropping a CSS file into `public/themes/` and adding one line to your `themes` config — no rebuild required.

## API

### `<ThemeProvider>`

| Prop                        | Type                            | Default                  | Description                                |
| --------------------------- | ------------------------------- | ------------------------ | ------------------------------------------ |
| `themes`                    | `Record<string, string>`        | _required_               | Map of palette names to CSS file URLs      |
| `defaultMode`               | `"light" \| "dark" \| "system"` | `"system"`               | Initial mode                               |
| `defaultPalette`            | `string`                        | First key in `themes`    | Initial palette                            |
| `modeStorageKey`            | `string`                        | `"shadcn-theme-mode"`    | localStorage key for mode                  |
| `paletteStorageKey`         | `string`                        | `"shadcn-theme-palette"` | localStorage key for palette               |
| `attribute`                 | `"class" \| "data-mode"`        | `"class"`                | How mode is applied to `<html>`            |
| `nonce`                     | `string`                        | —                        | CSP nonce for injected `<link>` tags       |
| `disableTransitionOnChange` | `boolean`                       | `false`                  | Add `[data-switching]` during palette swap |

### `useTheme()`

```ts
const {
  mode, // current ThemeMode ("light" | "dark" | "system")
  setMode, // (mode: ThemeMode) => void
  palette, // current palette name
  setPalette, // (palette: string) => void
  resolvedMode, // always "light" | "dark" (resolves "system")
  themes, // string[] — available palette names
} = useTheme();
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
