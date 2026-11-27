//// Neoffice — added file (no upstream equivalent).
//
// The Neoffice desk shows this application in a frame under the tabs of its Hotel space: the same document, opened as
// /kamra/<screen>?embed=1. The desk already draws the menu, the search and the notifications around the frame, so the
// application leaves its own chrome out (AppShell) and talks to the desk (FramedBridge). Same contract as the other
// applications the desk frames: « <app>:route » from the frame, « <app>:navigate » to it, the path relative to the
// application's root (« /reservations »).
//
// The query only tells the first page: the first click inside the frame navigates and the address loses it. A frame is
// then told by its top being another window of the same origin. A top window of another origin is a hotel's own website
// showing a Kamra page: that is not the desk, and it keeps the page as it was.

/** Whether this document is shown in a frame of the Neoffice desk, rather than as a page of its own. */
export function isFramed(): boolean {
  if (typeof window === "undefined") return false
  if (new URLSearchParams(window.location.search).get("embed") === "1" && window.self !== window.top) return true
  try {
    return window.self !== window.top && window.top!.location.origin === window.location.origin
  } catch {
    // A top window of another origin refuses to be looked at: not the desk.
    return false
  }
}

/** The frame tells the desk the screen it shows: `{ type, path }`, the path inside the application. */
export const ROUTE_MESSAGE = "kamra:route"
/** The desk tells the frame the screen to show: `{ type, path }`. */
export const NAVIGATE_MESSAGE = "kamra:navigate"

/** An address inside the application: one slash to start with, no second one (`//host`) and no backslash. */
export function isAppPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    /^\/(?![/\\])/.test(path) &&
    // No control character: a line break in an address is how a header or a log line gets forged.
    !Array.from(path).some((char) => char.charCodeAt(0) < 32)
  )
}

/** The desk's own theme, read from its <html data-theme> (same origin, so readable); null when not framed. */
export function readDeskTheme(): "light" | "dark" | null {
  if (!isFramed()) return null
  try {
    const value = window.parent.document.documentElement.getAttribute("data-theme")
    return value === "dark" ? "dark" : "light"
  } catch {
    return null
  }
}

// What the Hotel space leaves out of the application's own menu (the table of Neoffice/Kamra-PMS note 17, validated by
// Jérémy on 27.11): the restaurant is NeoResto's, the books are the ERP's, the assistant is Nora, the rest is not
// offered with one hotel per instance. A hidden screen still opens from a link or the address: only the menu leaves it out.
/** The applications of the application's own menu that the framed menu does not offer. */
export const FRAMED_HIDDEN_APPS: readonly string[] = ["fnb", "unit-owners"]
/** The screens, by route, that the framed menu does not offer in the applications it keeps. */
export const FRAMED_HIDDEN_ROUTES: readonly string[] = [
  "/assistant",
  "/crs",
  "/recreation",
  "/whatsapp",
  "/payables",
  "/cash-forecast",
  "/profit-and-loss",
  "/accounting-export",
  "/marketplace",
  "/developers",
  "/setup",
]
