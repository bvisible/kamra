import { isFramed, readDeskTheme } from "./framed" //// Neoffice: see initTheme

export type Theme = "light" | "dark" | "system"

const KEY = "kamra-theme"

export const getTheme = (): Theme => {
  const t = localStorage.getItem(KEY)
  return t === "dark" || t === "system" ? t : "light"
}

const resolve = (t: Theme) =>
  t === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : t

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", resolve(t) === "dark")
}

export function setTheme(t: Theme) {
  localStorage.setItem(KEY, t)
  applyTheme(t)
}

/** Call once at boot: applies the stored theme and follows OS changes
 * while in "system" mode. */
export function initTheme() {
  //// Neoffice: the application framed in a tab of the desk wears the desk's theme, read from its <html data-theme> and
  //// followed live, and writes none of its own keys (the storage is shared with the application's own pages: a choice
  //// made around the frame would otherwise switch them too). See lib/framed.ts.
  if (isFramed()) {
    const follow = () => document.documentElement.classList.toggle("dark", readDeskTheme() === "dark")
    follow()
    try {
      new MutationObserver(follow).observe(window.parent.document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      })
    } catch {
      // The desk above refuses to be looked at: the theme stays what it was drawn as.
    }
    return
  }
  applyTheme(getTheme())
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getTheme() === "system") applyTheme("system")
    })
}
