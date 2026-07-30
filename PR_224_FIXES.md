# PR #224 Follow-up Fixes: False "Unsaved Changes" Indicator

**PR**: https://github.com/cureinternational/openmrs-module-bahmniapps/pull/224
**Branch**: `bugfix-121639-obs-unsaved-state` (checked out locally as `pr-224-local`)
**Status**: 3 local commits on top of the PR, **not pushed to remote**
**File touched**: `ui/app/clinical/consultation/controllers/conceptSetPageController.js`

PR #224 fixed the original bug report (orange "Unsaved Changes" icon appearing
immediately on reopening a saved Observation form with a provider/Surgeon/Nurse
field), but its CI build was failing (8 Karma spec failures) and the fix had
gaps that still let 2 related false-positive scenarios through. This log
documents the 3 follow-up commits made to close those gaps.

---

## Commit 1 — `9b12d02f9`: correct inverted obs-reload condition, drop `firstWatchFired` hack

**Root cause 1 — inverted guard.** In `collectObservationsFromConceptSets`,
the condition `!template.observations || template.observations.length !== 0`
re-fetched/overwrote a template's observations on almost every call (true
whenever the array had *any* items), instead of only when it was empty.
Changed `!== 0` → `=== 0`.

**Root cause 2 — `firstWatchFired` swallowed the first real edit.** The PR's
`$watch` listener used a `firstWatchFired` flag to unconditionally discard the
very first watch firing, as a blunt way to suppress the false-positive on
reopen. This also silently ate the dirty flag on a genuinely **blank new
form's first edit** — a production bug, not just a reopen-specific one.
Removed the flag; replaced it with a settle `$timeout(0)` that recaptures the
baseline in the draft-resume branch of `setupDirtyTracking`, once, after
Form2/React components finish their initial async load — mirroring the
existing `postSaveRefreshPending` settle pattern already used elsewhere in
this file.

**Result**: fixed all 8 CI-failing Karma specs (Save-As-Draft / dirty-state /
auto-save group in `conceptSetPageController.spec.js`).

---

## Commit 2 → refined by Commit 3 — the WHODAS reopen case

**Symptom**: on the live local stack, reopening `[M&E] WHODAS for
non/school-going child` (a Form2/React-backed form) showed the orange
indicator immediately, with no edits made.

**Root cause**: `updateTemplateDirtyIndicators` only guarded the
*populated → empty* transition (observations disappearing). It didn't guard
the reverse: Form2/React templates like WHODAS start with an **empty**
baseline snapshot (`component.getValue()` isn't ready yet), then the async
component finishes loading a digest or more later and populates real values —
which looked identical to a user typing into a blank form, so it got flagged
dirty.

- **Commit `03d281efd`** made the guard symmetric: recapture the baseline
  instead of flagging dirty whenever *either* side of the comparison was the
  empty-array baseline (`currentVal === '[]' || cachedVal === '[]'`).
  - This introduced **2 new Karma regressions**
    (`Draft Indicator should/should not set hasUnsavedFormObservations...`).
    Root cause: AngularJS's `$watch` always invokes its listener the first
    time with `newVal === oldVal`, so a template's *first* real edit is never
    seen by `updateTemplateDirtyIndicators` — its cached baseline stays `'[]'`
    until the *second* real change. The fully-symmetric guard couldn't tell
    that apart from the WHODAS async-load case, so it silently swallowed a
    genuine second edit on a plain (non-Form2) template too.

- **Commit `c00b8df5d`** narrowed the fix: the empty-baseline recapture now
  only applies when `template.component` is set (i.e. the template is a
  Form2/React bridge, which is the only case where an empty→populated jump
  can be an async load finishing rather than a user edit). Plain Angular
  observation-array templates keep flagging dirty on their first real change,
  as before.

**Result**: WHODAS reopen no longer shows the false indicator; the 2
regressions are gone; full suite back to green.

---

## Bonus fix (included in commit `c00b8df5d`) — false dirty right after Save

**Symptom**: immediately after a successful Save, the orange indicator could
reappear with no further edits, when the save response included extra
server-computed observation values not present in the pre-save model.

**Root cause**: `resetDraftStateAfterSave` and the `event:save-successful`
listener each snapshotted the "clean" post-save baseline with a single
`$timeout(0)` tick. Form2/React components (and server-added "extra" values)
can take **an extra digest cycle** to settle into the Angular model — the
same reason `setupDirtyTracking`'s normal page-load path already uses a
**double**, nested `$timeout(0)` settle. The save-path handlers were missing
that second tick, so late-arriving values got diffed against a stale
baseline and falsely marked the form dirty.

**Fix**: extracted the snapshot logic into shared closures
(`captureSettledCleanState` / `captureSettledCleanStateOnSave`) and call them
twice, via a nested `$timeout(0)`, matching the existing double-settle
pattern.

---

## Verification

- Full Karma suite: **2896/2896 passing**, 0 regressions, coverage above CI
  thresholds (was 8 failing on original PR CI).
- ESLint: clean, 0 errors (pre-existing warnings only).
- Live-verified against the local Bahmni Docker stack
  (`https://localhost/bahmni/...`):
  - Original PR #224 scenario (reopen a saved form with a provider field) —
    no false indicator.
  - WHODAS non/school-going child reopen — no false indicator (DOM checked
    for absence of the `has-unsaved-form-observations` class).
  - Confirmed via network capture that a genuinely **stale, unmarked draft
    record** can independently reproduce the same symptom (server-side data
    issue, not a code bug) — cleared manually via the app's own
    `PATCH /openmrs/ws/rest/v1/bahmnicore/formdraft` API for the test
    patient during verification.

## Known follow-up not yet addressed (flagged, not fixed)

`consultationController.js`'s `formDraftService.markDraftAsSaved(...)
.catch(function () {})` silently swallows failures. This is a plausible
systemic root cause for why stale, unmarked drafts recur for real users (as
seen during live verification above), independent of the dirty-tracking
logic fixed here. Not in scope for this fix set — flagged for a follow-up
ticket.
