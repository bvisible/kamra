//// Neoffice — added file (no upstream equivalent).
//
// The talk between the Neoffice desk and this application framed in a tab of its Hotel space. The desk keeps one frame
// for the application: another tab moves the frame to that screen without loading the application again, and the desk's
// address follows the screen the frame shows, so that a reload or a shared link lands on the same screen. See
// lib/framed.ts for the two messages.
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { NAVIGATE_MESSAGE, ROUTE_MESSAGE, isAppPath } from "../lib/framed"

export function FramedBridge() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (window.parent === window) return
    // The flag the desk added to open the frame is not part of the screen.
    const query = new URLSearchParams(search)
    query.delete("embed")
    const rest = query.toString()
    const path = pathname + (rest ? `?${rest}` : "") + hash
    window.parent.postMessage({ type: ROUTE_MESSAGE, path }, window.location.origin)
  }, [pathname, search, hash])

  useEffect(() => {
    const current = pathname + search + hash
    const onMessage = (event: MessageEvent) => {
      // The desk is the window above, on this origin: nothing else decides where the frame goes.
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      const message = event.data as { type?: unknown; path?: unknown } | null
      if (!message || typeof message !== "object" || message.type !== NAVIGATE_MESSAGE) return
      if (!isAppPath(message.path) || message.path === current) return
      // Replace, not push: the desk wrote this screen in its own history already, and a second entry made the Back button
      // need two presses for one tab.
      navigate(message.path, { replace: true })
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [navigate, pathname, search, hash])

  return null
}
