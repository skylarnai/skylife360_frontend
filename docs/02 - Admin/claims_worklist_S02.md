# S02 — Claims worklist

| Field | Value |
|---|---|
| Screen | S02 — Claims (admin worklist) |
| Role | Admin |
| Route | `/claims` (admin landing page) |
| Prototype reference | `viewWorklist()`, `CLAIMS` |
| Depends on | S00, S01 |
| Next screens that depend on this | S03 Claim desk (opened from a row) |
| Status | Planned |
| API readiness | Partial: the tile counts are READY, the table needs `GET /claims` (**NEEDED**) |

## 1. Purpose

Show every open claim of the hospital in one table, with where it is (stage) and what it needs, so the claims admin knows what to work on next and can open it in the claim desk.

## 2. Users and permissions

Admin only (`gaps:run`). Doctor / Staff never see claim amounts or payer details.

## 3. Layout

```
┌ main ────────────────────────────────────────────────────────────┐ ┌ rail (dev) ──────────┐
│ Claims                                         [ + New claim ]   │ │ API for this screen  │
│ ┌open claims┐┌awaiting approval┐┌items to fix┐┌settled this week┐│ │ GET /claims/intake/… │
│ │    3      ││        1        ││     4      ││        1        ││ │ GET /reviews/pending │
│ └───────────┘└─────────────────┘└────────────┘└─────────────────┘│ │ GET /claims/submis…  │
│ [Search claim / patient]  [Stage ▾]  [Payer ▾]                    │ │ GET /claims  NEEDED  │
│ CLAIM          PATIENT     PROCEDURE      PAYER       AMOUNT STAGE  STATUS            │
│ SUV-261028-01  SYN-P-1042  Lap. chole…    SYN-07·TPA ₹1,48,600 PRE-SUBMISSION [3 items to fix] [Open] │
│ SUV-261027-03  SYN-P-1077  PTCA + DES     PM-JAY     ₹1,10,000 IN TREATMENT  [Pre-auth approved]      │
│ …                                                                 │ └──────────────────────┘
│                                       ‹ 1 2 3 ›  20 per page      │
└──────────────────────────────────────────────────────────────────┘
```

Table min-width 820px inside a horizontally scrolling box. Claim and patient IDs are mono 12.5px; the claim ID is accent-coloured.

## 4. Content and states

| Column | Content |
|---|---|
| Claim | Claim number (`SUV-261028-01`) |
| Patient | Patient ID (`SYN-P-1042`) |
| Procedure | Package / procedure name |
| Payer | "Insurer SYN-07 · TPA SYN-3" or "PM-JAY" (small, muted) |
| Amount | Estimated claim value, `num` column |
| Stage | Stage chip (S00 map) |
| Status | Chip with the one most important next thing: "3 items to fix" (amb), "Pre-auth approved" (ok), "Paid ₹36,450" (ok), "Discharge summary not signed" (amb) |
| — | `Open` button (primary) |

Tiles: open claims · awaiting approval (`GET /reviews/pending` total) · items to fix · settled this week.

States: loading (skeleton rows), empty ("No claims yet. Upload documents to start one." + New claim button), error (ErrorBox + Retry).

## 5. Interactions

- Click a row or `Open` → `/claims/:claimId/upload` (or the claim's current step).
- `+ New claim` → creates a draft claim (NEEDED `POST /claims`), then opens the desk on step 1.
- Search filters by claim number or patient ID (debounced 300ms, sent as `q`).
- Stage and payer filters go into the URL query (`?stage=Pre-submission`) so the view can be shared and survives refresh.
- Sorted newest first by default; clicking Amount or Stage headers sorts.

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/claims?stage=&payer=&q=&limit=&offset=` | **NEEDED** | The table rows: claim, patient, procedure, payer, amount, stage, next-action text, current desk step |
| POST | `/api/v1/claims` | **NEEDED** | Create a claim draft for "+ New claim" |
| GET | `/api/v1/reviews/pending?limit=1` | READY | `total` → "awaiting approval" tile |
| GET | `/api/v1/claims/submissions` | READY | Submitted claims and status ("settled this week" until `/claims` returns it) |
| GET | `/api/v1/claims/intake/{intake_id}` | READY | One intake record (used by the desk, listed here for the rail) |

Until `GET /claims` exists, read the rows from a mock (`features/claims/api/claimsApi.mock.js`) with the four prototype claims.

## 7. Data mapping

| API field (proposed `/claims` row) | UI |
|---|---|
| `claim_id` | Claim |
| `user_id` | Patient |
| `procedure_name` | Procedure |
| `payer_name`, `tpa_name` | Payer ("Insurer SYN-07 · TPA SYN-3") |
| `estimated_amount` | Amount (INR) |
| `stage` | Stage chip |
| `next_action: { text, tone }` | Status chip |
| `current_step` | Which desk step `Open` lands on |

## 8. Components

S00: `TileGrid`, `Tile`, `DataTable`, `Chip`, `Button`, `SearchInput`, `Select`, `TwoColumn`, `ApiRail`. New: `features/claims/components/ClaimStageChip.jsx`, `Pagination` (move to `components/ui` if S05 needs it too).

## 9. Files to create

```
src/features/claims/
  pages/ClaimsWorklistPage.jsx
  components/WorklistTiles.jsx  ClaimsTable.jsx  ClaimFilters.jsx  ClaimStageChip.jsx
  api/claimsApi.js  claimsApi.mock.js
  hooks/useClaims.js  (query keys: ['claims', filters])  useCreateClaim.js
```

## 10. Acceptance criteria

1. The table shows the four prototype claims from the mock with the same chips and colours.
2. The "awaiting approval" tile shows the real `total` from `/reviews/pending`.
3. Filters live in the URL; reload keeps them.
4. Rows open the desk with Enter or Space.
5. At 375px the table scrolls inside its box and the tiles wrap to two per row.
6. Doctor / Staff opening `/claims` gets the 403 message.

## 11. Backend gaps and open questions

- **NEEDED:** a `claims` table and `GET/POST /api/v1/claims` (also listed in `claims_prototype_missing.md`). Today a claim exists only as an intake record (`/claims/intake/{id}`) and an encounter ID.
- Who computes the "next action" text, the backend or the UI? Recommended: backend, so the worklist and the desk header agree.

## 12. Build prompt for Claude

> Build S02 from `docs/02 - Admin/claims_worklist_S02.md`. Use the S00 components. Read rows from `claimsApi.mock.js` (the four prototype claims) behind the same function signature the real `GET /api/v1/claims` will use, and read the "awaiting approval" tile from the real `GET /api/v1/reviews/pending`. Put filters in the URL. Meet section 10, then run lint and build.
