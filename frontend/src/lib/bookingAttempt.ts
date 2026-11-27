//// Neoffice — added file (no upstream equivalent)
// The idempotency key of a public booking attempt. Upstream's pages send none, so a double click, or a retry after an answer
// that never arrived, created two reservations. The key stays the same while what is sent is the same (a second click, a
// retry) and changes as soon as the guest changes anything (another room, dates, name…), so a new booking is never swallowed
// as the replay of an old one. Used by PublicBooking.tsx and PublicListing.tsx.

export type BookingAttempt = { key: string; signature: string }

// crypto.randomUUID needs a secure page; a plain-http page (a dev server) falls back to a random string
function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

/** The attempt for this payload: the current one when nothing changed, a new one otherwise. */
export function attemptFor(current: BookingAttempt | null, payload: unknown): BookingAttempt {
  const signature = JSON.stringify(payload)
  return current && current.signature === signature ? current : { key: newKey(), signature }
}
