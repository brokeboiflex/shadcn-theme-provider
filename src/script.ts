import { resolveThemeOptions } from "./options"
import type { ThemeOptions } from "./options"

export type { ThemeMode, ThemeOptions } from "./options"

/**
 * Returns the source of a self-invoking script that applies the persisted
 * (or default) mode and palette BEFORE the first paint. Takes the same
 * options as `<ThemeProvider>`, with the same defaults.
 *
 * `<ThemeProvider>` renders it inline, which runs before paint only when the
 * HTML is server-rendered (e.g. Next.js). Client-only apps (e.g. a Vite SPA)
 * inline it into `index.html` at build time instead: import it from
 * `shadcn-theme-provider/script`, which does not depend on React.
 *
 * The injected stylesheet <link> carries the same data attribute the
 * provider's effect looks for, so the effect recognises it and skips
 * re-injection. `nonce` is applied to that <link>; the <script> tag that
 * runs this code needs its nonce set by whatever renders the tag.
 */
export function getThemeScript(options: ThemeOptions): string {
  // <-escape to keep "</script>" sequences from terminating the tag
  const json = JSON.stringify(resolveThemeOptions(options)).replace(
    /</g,
    "\\u003c"
  )
  return `(function(c){try{var d=document,r=d.documentElement,m=null,p=null;try{m=localStorage.getItem(c.modeStorageKey);p=localStorage.getItem(c.paletteStorageKey)}catch(e){}m=m||c.defaultMode;var v=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;if(c.attribute==="class"){r.classList.remove("light","dark");r.classList.add(v)}else{r.setAttribute("data-mode",v)}p=p||c.defaultPalette;var h=c.themes[p];if(!h){p=c.defaultPalette;h=c.themes[p]}if(h&&!d.querySelector("link[data-shadcn-palette]")){var l=d.createElement("link");l.rel="stylesheet";l.href=h;l.setAttribute("data-shadcn-palette",p);if(c.nonce)l.nonce=c.nonce;d.head.appendChild(l);r.setAttribute("data-palette",p)}}catch(e){}})(${json})`
}
