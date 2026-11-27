//// Neoffice — added file (no upstream equivalent).
//
// The drawer of the Neoffice desk's window model (design system §6.18), for the drawers of this application when it is
// framed in a tab of the desk (lib/framed.ts): docked at the right, the form at the left, at the right one card as tall
// as the window (what the window is about, then the foot with the ink action), an eyebrow above the title, the cross in
// the card's corner. The look is index.css (`[data-kf]`, under html.kamra-framed); this file is the behaviour:
//   - leaving is protected: once something was typed, Escape, the veil and the cross ask first (the desk's question);
//   - the focus stays in the window (Tab, Shift+Tab) and goes back to the button that opened it;
//   - the keys are shown on the foot's buttons: ⌘↵ / Ctrl+↵ the ink action, from any field; Esc the way out;
//   - a drawer with no card of its own sums up what the form holds (« Résumé »), read from its fields.
// The standalone application is untouched: outside the desk every function here does what Kamra did before.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { Button } from "./button"
import { framedUI } from "../../lib/framed"
import { t as translate } from "../../lib/i18n"

const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "")
/** The key of the ink action, from any field of the window. */
export const forceKey = () => (isMac() ? "⌘↵" : "Ctrl+↵")

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
const FIRST_FIELD =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([readonly]):not([disabled]), ' +
  "textarea:not([readonly]):not([disabled]), select:not([disabled])"

// The windows open, the last on top: only the one on top answers the keyboard.
const stack: number[] = []
let seq = 0

function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** The ink action of a foot: the last visible ink button, enabled or not (its key is shown either way). */
function inkOf(scope: Element | null): HTMLButtonElement | null {
  if (!scope) return null
  const all = Array.from(scope.querySelectorAll<HTMLButtonElement>("[data-kf='foot'] button[data-variant='primary']"))
  const shown = all.filter(visible)
  return shown.length ? shown[shown.length - 1] : null
}

function showKeys(root: Element) {
  const foot = root.querySelector("[data-kf='foot']")
  if (!foot) return
  const ink = inkOf(root)
  const out = new Set([translate("Cancel"), translate("Close")])
  foot.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    let key = ""
    if (b === ink) key = forceKey()
    else if (b.getAttribute("data-variant") !== "primary" && out.has((b.textContent || "").trim())) key = "Esc"
    if (key) b.setAttribute("data-kf-key", key)
    else b.removeAttribute("data-kf-key")
  })
}

function trap(e: KeyboardEvent, box: Element | null) {
  if (!box) return
  const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)
  if (!items.length) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (!active || !box.contains(active) || active === box) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  } else if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

/**
 * The behaviour of a framed drawer. Put `root` on the window's outer element (it holds `[data-kf='panel']`), call
 * `attemptClose` from the veil and the cross, show `<FramedLeaveQuestion>` while `asking`, and `clean()` once the work is
 * saved (a closing after it asks nothing). Outside the desk, `attemptClose` is `onClose` and nothing else runs.
 */
export function useFramedDrawer(opts: { onClose: () => void }) {
  const framed = framedUI()
  const root = useRef<HTMLDivElement>(null)
  const [asking, setAsking] = useState(false)
  const askingRef = useRef(false)
  askingRef.current = asking
  const dirty = useRef(false)
  const closeRef = useRef(opts.onClose)
  closeRef.current = opts.onClose

  const attemptClose = useCallback(() => {
    if (framed && dirty.current) setAsking(true)
    else closeRef.current()
  }, [framed])
  const keep = useCallback(() => setAsking(false), [])
  const discard = useCallback(() => {
    setAsking(false)
    closeRef.current()
  }, [])
  const clean = useCallback(() => {
    dirty.current = false
  }, [])

  useEffect(() => {
    if (!framed) return
    const el = root.current
    if (!el) return
    const id = ++seq
    stack.push(id)
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Typing starts the work: a field that changed, inside the window, outside what it marks as not work (a search).
    const mark = (e: Event) => {
      const target = e.target as Element | null
      if (target && target.closest && target.closest("[data-kf='panel']") && !target.closest("[data-kf-skip]"))
        dirty.current = true
    }
    el.addEventListener("input", mark, true)
    el.addEventListener("change", mark, true)
    // The first field of the form, or the window itself when it is a reading: never a button.
    const focusFirst = window.setTimeout(() => {
      const body = el.querySelector("[data-kf='body']")
      const field = body ? Array.from(body.querySelectorAll<HTMLElement>(FIRST_FIELD)).find(visible) : null
      if (el.contains(document.activeElement) && document.activeElement !== document.body) return
      ;(field || el.querySelector<HTMLElement>("[data-kf='panel']"))?.focus({ preventScroll: true })
    }, 80)
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || e.defaultPrevented) return
      if (e.key === "Escape") {
        e.preventDefault()
        if (askingRef.current) setAsking(false)
        else attemptClose()
        return
      }
      if (askingRef.current && e.key === "Enter") {
        e.preventDefault()
        discard()
        return
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        const ink = inkOf(el)
        if (ink && !ink.disabled) {
          e.preventDefault()
          ink.click()
        }
        return
      }
      if (e.key === "Tab") trap(e, el.querySelector(askingRef.current ? "[data-kf='ask']" : "[data-kf='panel']"))
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(focusFirst)
      document.removeEventListener("keydown", onKey)
      el.removeEventListener("input", mark, true)
      el.removeEventListener("change", mark, true)
      const at = stack.indexOf(id)
      if (at >= 0) stack.splice(at, 1)
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [framed, attemptClose, discard])

  // The keys on the foot, after each render: a busy label (« Enregistrement… ») rewrites the button.
  useLayoutEffect(() => {
    if (framed && root.current) showKeys(root.current)
  })

  return { framed, root, attemptClose, asking, keep, discard, clean }
}

/** The question before leaving a window where something was typed (the desk's « protected exit »). */
export function FramedLeaveQuestion(props: { title?: string; onKeep: () => void; onDiscard: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div data-kf="ask-layer">
      <div data-kf="ask-veil" onClick={props.onKeep} aria-hidden />
      <div data-kf="ask" ref={box} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="kf-ask-title">
        {props.title ? <p data-kf="eyebrow">{props.title}</p> : null}
        <h2 data-kf="ask-title" id="kf-ask-title">
          {translate("Leave without saving your changes?")}
        </h2>
        <div data-kf="ask-foot">
          <Button variant="outline" onClick={props.onKeep} data-kf-key="Esc">
            {translate("Back")}
          </Button>
          <Button onClick={props.onDiscard} data-kf-key="↵">
            {translate("Discard")}
          </Button>
        </div>
      </div>
    </div>
  )
}

type Row = { label: string; value: string }

const SKIP_TYPES = new Set(["hidden", "password", "file", "search", "button", "submit", "reset", "image", "range", "color"])

function ownText(label: Element, field: Element): string {
  for (const node of Array.from(label.childNodes)) {
    if (node === field || (node instanceof Element && node.contains(field))) continue
    const text = (node.textContent || "").replace(/\s+/g, " ").trim()
    if (text) return text
  }
  return ""
}

function labelOf(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const aria = el.getAttribute("aria-label")
  if (aria) return aria.trim()
  const label = el.labels && el.labels[0]
  if (label) {
    const text = ownText(label, el)
    if (text) return text
  }
  const prev = el.previousElementSibling
  if (prev && /^(LABEL|SPAN|P|DIV)$/.test(prev.tagName) && !prev.querySelector("input, select, textarea")) {
    const text = (prev.textContent || "").replace(/\s+/g, " ").trim()
    if (text && text.length <= 60) return text
  }
  return (el.getAttribute("placeholder") || "").trim()
}

function dateText(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return value
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  } catch {
    return value
  }
}

function valueOf(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | null {
  if (el instanceof HTMLSelectElement) {
    if (!el.value) return null
    const option = el.selectedOptions[0]
    return option ? option.text.trim() : el.value
  }
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return el.checked ? "✓" : null
  const raw = (el.value || "").trim()
  if (!raw) return null
  if (el instanceof HTMLInputElement && el.type === "date") return dateText(raw)
  return raw.length > 80 ? raw.slice(0, 79) + "…" : raw
}

/** What the form holds now, field by field; a field gone from the screen (a wizard's past step) keeps its value. */
function readFields(body: Element, known: Map<string, string>): Row[] {
  body.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach((el) => {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return
    if (el.closest("table, [data-kf-skip]") || !visible(el)) return
    const label = labelOf(el)
    if (!label) return
    const value = valueOf(el)
    if (value === null) known.delete(label)
    else known.set(label, value)
  })
  return Array.from(known, ([label, value]) => ({ label, value })).slice(0, 14)
}

/** The card of a drawer that has none of its own: the window's title, its line, and the fields filled so far. */
export function FramedSummary(props: { title: string; description?: string; body: RefObject<HTMLElement | null> }) {
  const [rows, setRows] = useState<Row[]>([])
  const known = useRef(new Map<string, string>())
  useEffect(() => {
    const body = props.body.current
    if (!body) return
    let frame = 0
    let last = ""
    const read = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = readFields(body, known.current)
        const key = JSON.stringify(next)
        if (key !== last) {
          last = key
          setRows(next)
        }
      })
    }
    read()
    const later = window.setTimeout(read, 400)
    body.addEventListener("input", read, true)
    body.addEventListener("change", read, true)
    const watch = new MutationObserver(read)
    watch.observe(body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(later)
      body.removeEventListener("input", read, true)
      body.removeEventListener("change", read, true)
      watch.disconnect()
    }
  }, [props.body])
  return (
    <>
      <p data-kf="rail-eyebrow">{translate("Summary")}</p>
      <div data-kf="card">
        <div data-kf="card-name">{props.title}</div>
        {props.description ? <div data-kf="card-sub">{props.description}</div> : null}
        {rows.length ? (
          <dl data-kf="kv">
            {rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </>
  )
}
