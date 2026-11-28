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
- **A till of the same site may say its rate is final** (`kamra/api.py`, `_resolve_charge_gst`, one marked hunk): Kamra replaces the
  rate of a food line by the hotel's own; a meal already invoiced by the restaurant's till at its own VAT goes on the bill as a
  transit at 0 %, or the guest pays the VAT twice. `frappe.flags.kamra_rate_is_final` is set around one call by the hotel app,
  never by a request; every other caller is taxed as before. Tests live in the hotel app (`test_the_rate_of_the_till_is_kept.py`).
  Remove the day the restaurant's revenue and VAT no longer stay in the till's invoice.
- **A country pack may say the rate of an alcohol line without a rate** (`kamra/localization/__init__.py`, `alcohol_default_tax_rate`,
  and one marked hunk in `kamra/api.py`, `_resolve_charge_gst`): Kamra gave 18 % to any alcohol line that came without a rate, the
  Indian rate, in every country (a Swiss minibar bottle carried 18 % of VAT). A pack that defines `alcohol_tax_rate(property)` says
  the rate (the Swiss pack of the hotel app: its standard rate); every other pack keeps 18, so no other country changes. Tests live
  in the hotel app (`test_the_swiss_vat_rates_follow_the_settings.py`, `test_a_hotel_outside_switzerland_is_as_before.py`). Remove
  the day upstream resolves the rate of an alcohol line from the pack.
- **A country pack may price the levy of a night** (`kamra/localization/__init__.py`, `room_levy_for_night`, and one marked hunk in
  `kamra/folio.py`, `_post_room_levy`): Kamra's room levy is a percentage of the room rate; a Swiss tourist tax is a sum for each person
  and each night. A pack that defines `room_levy_for_night(prop_doc, reservation, night_rate)` returns the amount, the tax rate and the
  words of the line (the Swiss pack of the hotel app, from the sums of its settings); a pack that does not, or that answers None (a Swiss
  hotel with no sum set), leaves the percentage as it was, so no other country changes. The quote of a booking still knows the
  percentage only: the tourist tax is on the bill, not in the price announced. Tests live in the hotel app
  (`test_the_tourist_tax_is_per_person_and_per_night.py`). Remove the day upstream lets a pack price the levy.
- **The meals the restaurant's till put on the rooms, for the reception** (`frontend/src/components/MealsOnTheRooms.tsx`, one marked
  block in `screens/Billing.tsx`, two strings in `fr.json` and `de.json`): a card on « Guest bills » that lists, per stay in house, the
  meals a till of the same site invoiced and put on the bill (room, guest, each meal with its invoice, till and hour, and what the stay
  owes for them), read only. It asks the hotel app (`neohotel.till_plug.api.to_collect`, which answers hotel accounts only) and draws
  nothing where the app is absent, refuses the account or has nothing to list. Remove it with the restaurant's till on the room.
- **The built SPA is committed** (`kamra/public/frontend`, as upstream does): after any change to `frontend/` or a merge,
  rebuild it (`cd frontend && npm ci && npm run build`) and commit the result; never rebuild it on an instance.

## Merging upstream

`git fetch upstream` and merge a release tag; a conflict in `kamra/public/frontend` is settled by rebuilding it. After each merge run `kamra/tests/test_compat_v15.py`: two tests fail on
purpose when the merge adds a cache read without `expires=True` or a field named `*_seen` on a doctype that does not
track seen. A new `new_doc` with a Time field is covered by the empty-Time test.

## Security

Findings in upstream code go to upstream, privately, through its `SECURITY.md`. Nothing about them is written here.
