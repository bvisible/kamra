<!-- //// Neoffice — added file (no upstream equivalent) -->
# Fork markers: what cannot carry a marker comment

Read by `neoffice-ci/scripts/fork_markers.py`. Every change to upstream code carries a `//// Neoffice` comment with its reason;
these files cannot.

| Artifact | Why |
|---|---|
| `kamra/public/frontend/**` | The built single-page app, committed as upstream commits it. Rebuilt with `npm run build` in `frontend/` after a change to `frontend/` or a merge. |
| `frontend/src/i18n/locales/fr.json` | Added file, data only: the French dictionary (7,104 keys, one per entry of `catalog.csv`), translated with the vocabulary of the hotel space, then reviewed. JSON cannot carry a `////` comment; the rule is in `NEOFFICE.md`. `npm run i18n:coverage` lists any string of `catalog.csv` still missing here. |
| `frontend/src/i18n/catalog.csv` | Upstream catalogue of the UI strings with one Neoffice row: `Individual`, the booking type the server keeps in English, shown translated in the « Type » column of the reservations list (`screens/configs.ts`, marked; translated in the catalogue's languages and in French). CSV cannot carry a `////` comment; the reason is here. |
| `frontend/src/i18n/languages.json` | Upstream registry of UI languages with one Neoffice row: `fr` (Français), so the desk's French users get French in the framed Hotel space. JSON cannot carry a `////` comment; the reason is here. |
| `kamra/kamra/doctype/property/property.json` | Upstream's Indian defaults of a new hotel removed (`timezone` Asia/Kolkata, `country` India, `currency` INR): a new hotel takes the instance's zone, country and currency in `Property.before_insert` (marked there), and never moves the ERP's clock (`on_update`, marked). A first hotel had put a whole ERP on Calcutta time (neoffice-maintenance#3433, 27.11.2026). JSON cannot carry a marker. |
