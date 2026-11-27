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

## Merging upstream

`git fetch upstream` and merge a release tag. After each merge run `kamra/tests/test_compat_v15.py`: two tests fail on
purpose when the merge adds a cache read without `expires=True` or a field named `*_seen` on a doctype that does not
track seen. A new `new_doc` with a Time field is covered by the empty-Time test.

## Security

Findings in upstream code go to upstream, privately, through its `SECURITY.md`. Nothing about them is written here.
