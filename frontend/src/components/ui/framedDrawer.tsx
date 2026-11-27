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

// What the desk's navigation asks of each drawer open (leaveOpenDrawers, FramedBridge).
type OpenDrawer = { dirty: () => boolean; close: () => void; ask: (answer: (leave: boolean) => void) => void }
const registry = new Map<number, OpenDrawer>()

/**
 * The desk moves the frame to another screen (a tab clicked): the drawers open give way. Nothing typed in them: they
 * close, and the answer is yes. Typed work: the drawer that holds it (the clean ones above it closed) asks the question of
 * the protected exit; « Abandonner » closes them all (yes), « Retour » keeps everything (no: the screen stays).
 */
export function leaveOpenDrawers(): Promise<boolean> {
  const open = stack.map((id) => registry.get(id)).filter((d): d is OpenDrawer => !!d)
  if (!open.length) return Promise.resolve(true)
  const closeDown = (from: number, to: number) => {
    for (let i = from; i >= to; i--) open[i].close()
  }
  let at = -1
  for (let i = open.length - 1; i >= 0 && at < 0; i--) if (open[i].dirty()) at = i
  if (at < 0) {
    closeDown(open.length - 1, 0)
    return Promise.resolve(true)
  }
  closeDown(open.length - 1, at + 1)
  return new Promise((resolve) =>
    open[at].ask((leave) => {
      // « Abandonner » closed the drawer that asked; the ones under it follow.
      if (leave) closeDown(at - 1, 0)
      resolve(leave)
    }),
  )
}

function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** The elements of this drawer, not of a drawer opened over it (a check-in opened from the booking). */
function own<T extends Element>(root: Element, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter((x) => x.closest("[data-kf='sheet']") === root)
}

/** The ink action of a foot: the last visible ink button, enabled or not (its key is shown either way). */
function inkOf(root: Element | null): HTMLButtonElement | null {
  if (!root) return null
  const shown = own<HTMLButtonElement>(root, "[data-kf='foot'] button[data-variant='primary']").filter(visible)
  return shown.length ? shown[shown.length - 1] : null
}

/** What a field holds, to tell typed work from a field typed then erased (spaces are nothing). */
function fieldValue(el: Element): string {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return el.checked ? "1" : ""
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    return el.value.trim()
  if (el instanceof HTMLElement && el.isContentEditable) return (el.textContent || "").trim()
  return ""
}

/** The first field of the form, or the window itself when it is a reading: never a button. */
function focusFirst(root: Element) {
  const body = own<HTMLElement>(root, "[data-kf='body']")[0]
  const field = body
    ? Array.from(body.querySelectorAll<HTMLElement>(FIRST_FIELD))
        .filter((f) => f.closest("[data-kf='sheet']") === root)
        .find(visible)
    : null
  ;(field || own<HTMLElement>(root, "[data-kf='panel']")[0])?.focus({ preventScroll: true })
}

function showKeys(root: Element) {
  const foot = own(root, "[data-kf='foot']")[0]
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
  // The work: each field the person changed, with what it held when they came to it and what it holds now (a field gone
  // from the screen, a wizard's past step, keeps its last value). A field typed then erased is no work.
  const work = useRef({ first: new Map<Element, string>(), last: new Map<Element, string>() })
  const dirty = useCallback(() => {
    const { first, last } = work.current
    for (const [field, before] of first) {
      if (!last.has(field)) continue
      if ((field.isConnected ? fieldValue(field) : last.get(field)) !== before) return true
    }
    return false
  }, [])
  const closeRef = useRef(opts.onClose)
  closeRef.current = opts.onClose

  const attemptClose = useCallback(() => {
    if (framed && dirty()) setAsking(true)
    else closeRef.current()
  }, [framed, dirty])
  // The desk's navigation waits for the answer to its question (leaveOpenDrawers).
  const answer = useRef<((leave: boolean) => void) | null>(null)
  const keep = useCallback(() => {
    setAsking(false)
    const a = answer.current
    answer.current = null
    if (a) a(false)
  }, [])
  const discard = useCallback(() => {
    setAsking(false)
    closeRef.current()
    const a = answer.current
    answer.current = null
    if (a) a(true)
  }, [])
  const clean = useCallback(() => {
    work.current.first.clear()
    work.current.last.clear()
  }, [])

  useEffect(() => {
    if (!framed) return
    const el = root.current
    if (!el) return
    const id = ++seq
    stack.push(id)
    registry.set(id, {
      dirty,
      close: () => closeRef.current(),
      ask: (a) => {
        answer.current = a
        setAsking(true)
      },
    })
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // A field of the work: inside this window, outside what it marks as not work (a search).
    const isWork = (t: Element | null): t is Element =>
      !!t && !!t.closest && t.closest("[data-kf='sheet']") === el && !!t.closest("[data-kf='panel']") && !t.closest("[data-kf-skip]")
    // What a field held when the person came to it (before typing), then what it holds after each change.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Element | null
      if (isWork(t) && !work.current.first.has(t)) work.current.first.set(t, fieldValue(t))
    }
    const mark = (e: Event) => {
      const t = e.target as Element | null
      if (!isWork(t)) return
      if (!work.current.first.has(t)) work.current.first.set(t, "")
      work.current.last.set(t, fieldValue(t))
    }
    el.addEventListener("focusin", onFocusIn, true)
    el.addEventListener("input", mark, true)
    el.addEventListener("change", mark, true)
    // « Annuler » shows Esc: it asks first, as Escape does, once something was typed.
    const onCancel = (e: MouseEvent) => {
      const b = (e.target as Element | null)?.closest?.("[data-kf='foot'] button[data-kf-key='Esc']")
      if (!b || b.closest("[data-kf='sheet']") !== el || !dirty()) return
      e.preventDefault()
      e.stopPropagation()
      setAsking(true)
    }
    el.addEventListener("click", onCancel, true)
    // The field that had the focus went away (a wizard's next step): the focus goes to the new step's first field,
    // not to the page behind.
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as Element | null
      window.setTimeout(() => {
        if (stack[stack.length - 1] !== id || !t || t.isConnected || askingRef.current) return
        const active = document.activeElement
        if (active && active !== document.body) return
        focusFirst(el)
      }, 0)
    }
    el.addEventListener("focusout", onFocusOut, true)
    const firstFocus = window.setTimeout(() => {
      if (el.contains(document.activeElement) && document.activeElement !== document.body) return
      focusFirst(el)
    }, 80)
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || e.defaultPrevented) return
      if (e.key === "Escape") {
        e.preventDefault()
        if (askingRef.current) keep()
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
      window.clearTimeout(firstFocus)
      document.removeEventListener("keydown", onKey)
      el.removeEventListener("focusin", onFocusIn, true)
      el.removeEventListener("input", mark, true)
      el.removeEventListener("change", mark, true)
      el.removeEventListener("click", onCancel, true)
      el.removeEventListener("focusout", onFocusOut, true)
      const at = stack.indexOf(id)
      if (at >= 0) stack.splice(at, 1)
      registry.delete(id)
      // Gone while the desk waited for its answer (closed some other way): the desk may go on.
      const pending = answer.current
      answer.current = null
      if (pending) pending(true)
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [framed, attemptClose, discard, dirty, keep])

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
    // Back to the work: the field one was typing in gets the focus again (it is gone when the window closes).
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    box.current?.focus({ preventScroll: true })
    return () => {
      if (before && before.isConnected) before.focus({ preventScroll: true })
    }
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

/** A field of the summary: its label, its value, and whether it is a name typed (the card's name, as the desk's). */
type Row = { label: string; value: string; named: boolean }

const SKIP_TYPES = new Set(["hidden", "password", "file", "search", "button", "submit", "reset", "image", "range", "color"])
const squash = (text: string | null | undefined) => (text || "").replace(/\s+/g, " ").trim()

function ownText(label: Element, field: Element): string {
  for (const node of Array.from(label.childNodes)) {
    if (node === field || (node instanceof Element && node.contains(field))) continue
    const text = squash(node.textContent)
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
    const text = squash(prev.textContent)
    if (text && text.length <= 60) return text
  }
  return (el.getAttribute("placeholder") || "").trim()
}

/** The question a group of radio buttons answers (« Qui paie »): its legend, or the line just above the group. */
function groupLabelOf(el: HTMLInputElement): string {
  const box = el.closest("fieldset, [role='radiogroup']")
  if (box) {
    const legend = box.querySelector("legend")
    const text = squash(box.getAttribute("aria-label") || (legend && legend.textContent))
    if (text) return text
  }
  let group: Element | null = el.closest("label") || el
  const same = `input[type='radio'][name='${CSS.escape(el.name)}']`
  while (group && group.parentElement && group.parentElement.querySelectorAll(same).length <= 1) group = group.parentElement
  const prev = group && group.parentElement ? group.parentElement.previousElementSibling : null
  const text = prev && !prev.querySelector("input, select, textarea") ? squash(prev.textContent) : ""
  return text.length <= 60 ? text : ""
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

function rowOf(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): Row | null | undefined {
  // undefined: not a field of the summary; null: a field left empty
  if (el instanceof HTMLInputElement && el.type === "radio") {
    if (!el.checked) return undefined
    const question = groupLabelOf(el)
    const answer = labelOf(el)
    if (!answer) return undefined
    return question ? { label: question, value: answer, named: false } : { label: answer, value: "✓", named: false }
  }
  const label = labelOf(el)
  if (!label) return undefined
  if (el instanceof HTMLSelectElement) {
    const option = el.selectedOptions[0]
    return el.value ? { label, value: option ? option.text.trim() : el.value, named: false } : null
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked ? { label, value: "✓", named: false } : null
  const raw = (el.value || "").trim()
  if (!raw) return null
  if (el instanceof HTMLInputElement && el.type === "date") return { label, value: dateText(raw), named: false }
  const value = raw.length > 80 ? raw.slice(0, 79) + "…" : raw
  // a name is words typed in a line of text: not a number, an amount, a date, a phone or an address
  const line = el instanceof HTMLInputElement && el.type === "text" && el.inputMode !== "decimal" && el.inputMode !== "numeric"
  return { label, value, named: line && /\p{L}/u.test(raw) }
}

/** What the form holds now, field by field, in the order of the screen; a field gone from it (a wizard's past step)
 *  keeps its value and comes first. */
function readFields(body: Element, known: Map<string, Row>, keep?: (el: Element) => boolean): Row[] {
  const here = new Map<string, Row>()
  const emptied = new Set<string>()
  body.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach((el) => {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return
    if (el.closest("table, [data-kf-skip]") || !visible(el)) return
    if (keep && !keep(el)) return
    const row = rowOf(el)
    if (row === undefined) return
    if (row === null) emptied.add(labelOf(el))
    else if (!here.has(row.label)) here.set(row.label, row)
  })
  const past = Array.from(known.values()).filter((r) => !here.has(r.label) && !emptied.has(r.label))
  known.clear()
  for (const r of [...past, ...here.values()]) known.set(r.label, r)
  return Array.from(known.values()).slice(0, 15)
}

/** The card of a drawer that has none of its own (the desk's « what will be created »): the first name typed, else the
 *  window's title, quiet; the line it is given; then the fields filled so far. A reading (`onlyChanged`: a drawer with
 *  no foot) lists only what the person filled in it, not the defaults of the small forms it holds. */
export function FramedSummary(props: {
  title: string
  description?: string
  body: RefObject<HTMLElement | null>
  onlyChanged?: boolean
}) {
  const [rows, setRows] = useState<Row[]>([])
  const known = useRef(new Map<string, Row>())
  const touched = useRef(new WeakSet<Element>())
  const onlyChanged = !!props.onlyChanged
  useEffect(() => {
    const body = props.body.current
    if (!body) return
    let frame = 0
    let last = ""
    const keep = onlyChanged ? (el: Element) => touched.current.has(el) : undefined
    const touch = (e: Event) => {
      if (e.target instanceof Element) touched.current.add(e.target)
    }
    body.addEventListener("input", touch, true)
    body.addEventListener("change", touch, true)
    const read = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = readFields(body, known.current, keep)
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
      body.removeEventListener("input", touch, true)
      body.removeEventListener("change", touch, true)
      watch.disconnect()
    }
  }, [props.body, onlyChanged])
  const name = rows.find((r) => r.named)
  const rest = rows.filter((r) => r !== name)
  return (
    <>
      <p data-kf="rail-eyebrow">{translate("Summary")}</p>
      <div data-kf="card">
        <div data-kf="card-name" data-kf-empty={name ? undefined : ""}>
          {name ? name.value : props.title}
        </div>
        {props.description ? <div data-kf="card-sub">{props.description}</div> : null}
        {rest.length ? (
          <dl data-kf="kv">
            {rest.map((r) => (
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
