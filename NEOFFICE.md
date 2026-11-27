<!-- //// Neoffice — added file (no upstream equivalent) -->
# Neoffice fork of Kamra PMS

This repository is a fork of [Kamra PMS](https://github.com/Kamra-PMS/kamra-pms) (Apache-2.0), kept by bVisible /
Neoservice to run Kamra inside Neoffice. It is not the Kamra project and is not endorsed or supported by it.
Following [TRADEMARK.md](TRADEMARK.md), the name "Kamra" stays with upstream: the product built on this fork will carry
another name and will say it is based on Kamra PMS.

## Branch

`version-15` is the only branch: upstream `main` at v2.8.3 plus the changes listed here. Upstream stays reachable
through the `upstream` remote.

## What differs from upstream

Every change carries a `//// Neoffice` comment with its reason: `grep -rn "////" kamra`.

- **Frappe 15 support** (upstream targets Frappe 16 only). `kamra/compat_v15.py` and about a hundred marked lines:
  custom rights ("Permission Types") answered from Custom DocPerm, the map of rights the SPA draws its menus from,
  empty Time fields kept empty, cache reads that see a write made after a miss, fields Frappe 15 drops from a query
  (`last_seen`, `void_seen`), a reserved word in an `order_by`, three `["in", ["", None]]` filters that did not match
  NULL. Tests: `kamra/tests/test_compat_v15.py`. Measured on Frappe 15: evaluation harness 312/312, reception journey
  13/13, full suite 1,550 of 1,563 (the rest fail on Frappe 16 too, or are tests that call Frappe 16 functions).
- **Remove it all when Neoffice runs Frappe 16**: delete `kamra/compat_v15.py`, `kamra/tests/test_compat_v15.py` and
  the marked lines.

- **Framed in the Neoffice desk** (`?embed=1`): the application leaves out its own menu, top bar, search and nags, draws a one-row
  menu of the area it is in (`components/FramedStrip.tsx`), talks to the desk (`kamra:route` from the frame, `kamra:navigate`
  to it: `components/FramedBridge.tsx`) and wears the desk's theme (`lib/theme.ts`). Files: `frontend/src/lib/framed.ts`,
  `components/FramedBridge.tsx`, `components/FramedStrip.tsx`, and marked lines in `AppShell.tsx`, `main.tsx`, `index.css`.
- **French interface** (`frontend/src/i18n/locales/fr.json`, `languages.json`): upstream ships no French. The 7,103 strings of
  `catalog.csv` are translated with the vocabulary of the Neoffice hotel space (folio = « note de client », night audit =
  « clôture du jour »). Inside the desk's frame, the application follows the desk's language (`deskLanguage` in
  `frontend/src/lib/dir.ts`, marked `//// Neoffice`). A new string of the catalogue needs its French entry in `fr.json`: `npm run i18n:coverage` lists the missing ones.
- **The public booking page of a hotel outside India** (`kamra/public_api.py`, `frontend/src/screens/PublicBooking.tsx`,
  `PublicListing.tsx`, `BookingEngine.tsx`, `components/BookingLinks.tsx`): no leftover security deposit of 5,000, the region
  ("Lausanne, null"), the "Powered by Kamra" line removed (the name is reserved), the booking link under `/kamra/book` (a bare
  `/book` is the Neoffice theme's page on an instance), one idempotency key per booking attempt (`lib/bookingAttempt.ts`), a
  regional number locale and a currency symbol set apart from the figure, the real country in the structured data, and "Pay at
  hotel" forced where the country has no payment gateway (the "Payments" screen offers nothing else and says why). Tests:
  `kamra/tests/test_neoffice_public_booking.py`. Remove the payment rule the day a gateway exists for the country.
- **The built SPA is committed** (`kamra/public/frontend`, as upstream does): after any change to `frontend/` or a merge,
  rebuild it (`cd frontend && npm ci && npm run build`) and commit the result; never rebuild it on an instance.

## Merging upstream

`git fetch upstream` and merge a release tag; a conflict in `kamra/public/frontend` is settled by rebuilding it. After each merge run `kamra/tests/test_compat_v15.py`: two tests fail on
purpose when the merge adds a cache read without `expires=True` or a field named `*_seen` on a doctype that does not
track seen. A new `new_doc` with a Time field is covered by the empty-Time test.

## Security

Findings in upstream code go to upstream, privately, through its `SECURITY.md`. Nothing about them is written here.
