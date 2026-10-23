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
  // Mirrors toThemeMode() and toPalette() in options.ts: an invalid stored mode
  // or a palette missing from `themes` falls back exactly as the provider does.
  // <-escape to keep "</script>" sequences from terminating the tag
  const json = JSON.stringify(resolveThemeOptions(options)).replace(
    /</g,
    "\\u003c"
  )
  return `(function(c){try{
var d=document,r=d.documentElement;
var read=function(k){try{return localStorage.getItem(k)}catch(e){return null}};
var m=read(c.modeStorageKey),p=read(c.paletteStorageKey);
if(m!=="light"&&m!=="dark"&&m!=="system")m=c.defaultMode;
var v=m==="system"?(typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;
r.classList.remove("light","dark");
if(c.attribute==="class"){r.removeAttribute("data-mode");r.classList.add(v)}else{r.setAttribute("data-mode",v)}
var t=c.themes,o=function(k){return k!=null&&Object.prototype.hasOwnProperty.call(t,k)};
if(!o(p))p=o(c.defaultPalette)?c.defaultPalette:(Object.keys(t)[0]||"");
var h=o(p)?t[p]:null,links=d.querySelectorAll("link[data-shadcn-palette]"),l=links[0];
if(!h){links.forEach(function(n){n.remove()});r.removeAttribute("data-palette");return}
if(!l||l.getAttribute("data-shadcn-palette")!==p||l.getAttribute("href")!==h||l.nonce!==(c.nonce||"")){
links.forEach(function(n){n.remove()});l=d.createElement("link");l.rel="stylesheet";l.href=h;l.setAttribute("data-shadcn-palette",p);if(c.nonce)l.nonce=c.nonce;d.head.appendChild(l)
}else{links.forEach(function(n){if(n!==l)n.remove()})}
r.setAttribute("data-palette",p)
}catch(e){}})(${json})`
}
