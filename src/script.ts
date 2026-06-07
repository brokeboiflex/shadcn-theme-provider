import type { ThemeMode } from "./types"

type InitScriptConfig = {
  themes: Record<string, string>
  defaultMode: ThemeMode
  defaultPalette: string
  modeStorageKey: string
  paletteStorageKey: string
  attribute: "class" | "data-mode"
}

/**
 * Returns the source of a self-invoking script that applies the persisted
 * (or default) mode and palette BEFORE the first paint.
 *
 * Rendered inline by <ThemeProvider> so SSR'd pages (e.g. Next.js) don't
 * flash unthemed content while waiting for hydration. The injected
 * stylesheet <link> carries the same data attribute the provider's effect
 * looks for, so the effect recognises it and skips re-injection.
 */
export function themeInitScript(config: InitScriptConfig): string {
  // <-escape to keep "</script>" sequences from terminating the tag
  const json = JSON.stringify(config).replace(/</g, "\\u003c")
  return `(function(c){try{var d=document,r=d.documentElement,m=null,p=null;try{m=localStorage.getItem(c.modeStorageKey);p=localStorage.getItem(c.paletteStorageKey)}catch(e){}m=m||c.defaultMode;var v=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;if(c.attribute==="class"){r.classList.remove("light","dark");r.classList.add(v)}else{r.setAttribute("data-mode",v)}p=p||c.defaultPalette;var h=c.themes[p];if(!h){p=c.defaultPalette;h=c.themes[p]}if(h&&!d.querySelector("link[data-shadcn-palette]")){var l=d.createElement("link");l.rel="stylesheet";l.href=h;l.setAttribute("data-shadcn-palette",p);d.head.appendChild(l);r.setAttribute("data-palette",p)}}catch(e){}})(${json})`
}
