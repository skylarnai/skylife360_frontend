# S03.5 — Claim desk step 5: Integrity check

| Field | Value |
|---|---|
| Screen | S03.5 — Integrity check (fraud and tampering signals) |
| Role | Admin (`integrity:view`); Compliance later (`integrity:clear`) |
| Route | `/claims/:claimId/integrity` |
| Prototype reference | `viewDesk()` with `step === 4`, `INTEGRITY`, `FLAG` |
| Depends on | S03.4 (needs `packet_id`) |
| Status | Planned |
| API readiness | READY |

## 1. Purpose

Show the result of the checks for duplicate or resubmitted claims, pre-existing conditions, edited documents, invalid IDs and unusual bills, in plain words, so the admin knows what to look at before approving.

## 2. Users and permissions

`integrity:view` only. Doctors and staff never see this step; they only see that a claim is on hold. The step shows the plum note "Visible to admins only. Doctors and staff only see that a claim is on hold."

## 3. Layout

```
Integrity check                                                     Runs on the claim packet
┌ plum note: Visible to admins only. Doctors and staff only see that a claim is on hold. ┐
(5 passed) (1 to check) (0 failed)
┌ [PASSED] Duplicate documents                                          EXACT_DUPE (dev) ┐
│ No identical copy of these files in earlier claims. One duplicate inside this upload  │
│ was already set aside.                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ [CHECK] Document tampering                                             TAMPERING (dev) ┐
│ anaesthesia_record.jpg was re-saved by an editing app after the scan date. Often      │
│ harmless (rotated or cropped); check before approving.                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
[Next: approve & submit →]
```

## 4. Content and states

| State | UI |
|---|---|
| No packet | `EmptyStep` → step 4 |
| Packet built, no run yet | Run integrity check button (only when the intake did not queue one, e.g. an older packet) |
| `QUEUED` / `PROCESSING` | "Checking… usually under a minute" with spinner; poll every 3s |
| `COMPLETED` | Summary pills + one row per check |
| `FAILED_SYSTEM` | ErrorBox "The integrity check could not finish" + Run again |
| Degraded checks (`degraded_checks` > 0) | Amber note "N checks ran with limited data" |

Check labels (from `check_type`):

| `check_type` | Label |
|---|---|
| `EXACT_DUPE` | Duplicate documents |
| `SEMANTIC_DUPE` | Resubmitted claim |
| `FUZZY_MATCH` | Pre-existing condition / identity match |
| `TAMPERING` | Document tampering |
| `ID_VERIFY` | Policy and ID checks |
| `ANOMALY` | Unusual billing |

Unknown types: show the API `summary` with the raw type as the label.

## 5. Interactions

- Normally nothing to click: the run was queued by step 4, and the page polls until it completes. Activity on completion: "integrity check: 5 passed, 1 to check".
- **Run integrity check** (fallback) → `POST /integrity/check`.
- Clicking a check that names a file opens that document (S05 detail).

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| GET | `/api/v1/integrity/runs/{run_id}` | READY | `{ run_id, packet_id, status (QUEUED · PROCESSING · COMPLETED · FAILED_SYSTEM), overall_flag (PASS · SOFT_WARN · HARD_FAIL), hard_fails, soft_warns, degraded_checks, checks[] }` |
| GET | `/api/v1/integrity/checks/{packet_id}` | READY | Latest run for the packet (when the desk only knows `packet_id`) |
| POST | `/api/v1/integrity/check` | READY | `{ packet_id }` → `202 { run_id, status, check_status_url }` |
| GET | `/api/v1/integrity/files/{file_id}` | READY | Forensics of one upload (detail for a tampering row) |

`run_id` comes from the intake (`integrity_run_id`) or `pipeline`.

## 7. Data mapping

| API | UI |
|---|---|
| `checks[].result_flag` | `PASSED` ok / `CHECK` amb / `FAILED` red |
| `checks[].check_type` | Label (table above); raw code in mono only with the API panel on |
| `checks[].summary` | Muted text |
| counts of each flag | Pills "5 passed · 1 to check · 0 failed" |

Confirm `IntegrityCheckOut` field names in `app/features/f005_integrity_check/schemas.py` when building.

## 8. Components

S00: `Note` (plum), `Pill`, `Chip`, `ErrorBox`, `EmptyStep`. New: `features/integrity/components/IntegrityCheckRow.jsx`, `IntegritySummary.jsx`.

## 9. Files to create

```
src/features/integrity/
  api/integrityApi.js     getRun(), getLatestForPacket(), requestCheck(), getFileForensics()
  hooks/useIntegrityRun.js  (polls while QUEUED / PROCESSING)
  components/IntegrityCheckRow.jsx  IntegritySummary.jsx
  constants.js            CHECK_LABELS, FLAG_VIEW
src/features/claim-desk/steps/IntegrityStep.jsx
```

## 10. Acceptance criteria

1. With the prototype data: pills "5 passed · 1 to check · 0 failed" and six rows in the prototype's order and wording.
2. Polling stops at `COMPLETED` or `FAILED_SYSTEM`, and when the user leaves the step.
3. Raw `check_type` codes are hidden unless the API panel is on.
4. A Doctor / Staff user cannot reach this route (403).

## 11. Backend gaps and open questions

- The roles that hide this step from doctors are enforced only in the UI until the backend `require_permission("integrity:view")` lands (auth module).

## 12. Build prompt for Claude

> Build S03.5 from `docs/02 - Admin/Claim Desk/desk_integrity_S03.5.md`. Read the run with `GET /api/v1/integrity/runs/{integrity_run_id}` (poll while queued or processing) and fall back to `GET /integrity/checks/{packet_id}` and `POST /integrity/check`. Map check types to the plain labels in section 4. Meet section 10, then run lint and build.
