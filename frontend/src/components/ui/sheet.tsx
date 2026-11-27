import { useEffect, useId, useRef } from "react" //// Neoffice — useId, useRef: the framed drawer below
import { X } from "lucide-react"
import { Button } from "./button"
import { t as translate, useUILanguage } from "../../lib/i18n"
import { FramedLeaveQuestion, FramedSummary, useFramedDrawer } from "./framedDrawer" //// Neoffice
import { framedUI } from "../../lib/framed" //// Neoffice

//// Neoffice — the props are named once for the two drawers below; `eyebrow` and `aside` are read by the framed one only.
type SheetProps = {
  title: string
  description?: string
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
  /** Wide surface (~2/3 screen) for rich detail panels. */
  wide?: boolean
  /** Framed in the desk: the line above the title (the Hotel space by default). */
  eyebrow?: string
  /** Framed in the desk: the card at the right; without it the drawer sums up its own fields. */
  aside?: React.ReactNode
}

/**
 * Right-side drawer for create/edit forms - Kamra's standard form surface.
 * Content scrolls; header and footer stay pinned.
 */
//// Neoffice — framed in a tab of the Neoffice desk (lib/framed.ts), the drawer is the desk's (FramedSheet below, the
//// window model of the design system); the standalone application keeps Kamra's own drawer (PlainSheet).
export function Sheet(props: SheetProps) {
  return framedUI() ? <FramedSheet {...props} /> : <PlainSheet {...props} />
}

//// Neoffice — Kamra's drawer, unchanged, renamed from Sheet so that the framed one can stand beside it.
function PlainSheet(props: SheetProps) {
  useUILanguage()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={props.onClose}
        aria-hidden
      />
      <div
        className={
          props.wide
            ? "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl animate-sheet-in md:w-2/3"
            : "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-sheet-in"
        }
      >
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{props.title}</h2>
            {props.description && (
              <p className="mt-0.5 text-sm text-zinc-400">
                {props.description}
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={props.onClose} aria-label={translate("Close")}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{props.children}</div>

        {props.footer && (
          <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4">
            {props.footer}
          </div>
        )}
      </div>
    </div>
  )
}

//// Neoffice — added: the drawer of the desk's window model (design system §6.18), the look in index.css ([data-kf]),
//// the behaviour in framedDrawer.tsx (protected exit, focus kept and given back, keys shown). The form at the left, at
//// the right one card: the drawer's own `aside`, or the summary of its fields, and the foot with the ink action.
function FramedSheet(props: SheetProps) {
  useUILanguage()
  const kf = useFramedDrawer({ onClose: props.onClose })
  const body = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div data-kf="sheet" ref={kf.root} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div data-kf="veil" onClick={kf.attemptClose} aria-hidden />
      <div data-kf="panel" tabIndex={-1}>
        <header data-kf="head">
          <p data-kf="eyebrow">{props.eyebrow ?? translate("Hotel")}</p>
          <h2 data-kf="title" id={titleId}>
            {props.title}
          </h2>
          {props.description ? <p data-kf="desc">{props.description}</p> : null}
        </header>
        <button
          type="button"
          data-kf="close"
          onClick={kf.attemptClose}
          aria-label={translate("Close")}
          title={`${translate("Close")} (Esc)`}
        >
          <X className="size-5" />
        </button>
        <div data-kf="body" ref={body}>
          {props.children}
        </div>
        <div data-kf="rail">
          <div data-kf="aside" data-kf-aside={props.aside ? "own" : "summary"}>
            {/* //// Neoffice — the summary names what was typed; the head's line is not repeated in it */}
            {props.aside ?? <FramedSummary title={props.title} body={body} />}
          </div>
          {props.footer ? <div data-kf="foot">{props.footer}</div> : null}
        </div>
      </div>
      {kf.asking ? <FramedLeaveQuestion title={props.title} onKeep={kf.keep} onDiscard={kf.discard} /> : null}
    </div>
  )
}
