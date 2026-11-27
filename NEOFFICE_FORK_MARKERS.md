<!-- //// Neoffice — added file (no upstream equivalent) -->
# Fork markers: what cannot carry a marker comment

Read by `neoffice-ci/scripts/fork_markers.py`. Every change to upstream code carries a `//// Neoffice` comment with its reason;
these files cannot.

| Artifact | Why |
|---|---|
| `kamra/public/frontend/**` | The built single-page app, committed as upstream commits it. Rebuilt with `npm run build` in `frontend/` after a change to `frontend/` or a merge. |
