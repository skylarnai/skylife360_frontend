# S03.4 — Claim desk step 4: Check gaps and build the packet

| Field | Value |
|---|---|
| Screen | S03.4 — Check gaps against payer rules; claim packet |
| Role | Admin (`gaps:run`, `packets:build`) |
| Route | `/claims/:claimId/gaps` |
| Prototype reference | `viewDesk()` with `step === 3`, `GAPS`, action `runGaps` |
| Depends on | S03, S03.2 |
| Status | Planned |
| API readiness | READY |

## 1. Purpose

Check the claim's documents against the payer's rules, the disease registry and the hospital tariff; list what blocks the claim, what should be fixed and what passed, each with its source page; and build the claim packet in the payer's format.

## 2. Users and permissions

`gaps:run` to run; `packets:build` to download the packet. A gap item linked to a doctor's to-do shows as fixed once that to-do is done (S08).

## 3. Layout

**Before the run**

```
Check gaps against payer rules                         Insurer SYN-07 rules in force on 9 Oct
Checks the documents against the payer's rules, the disease registry and the hospital tariff,
then builds the claim packet.
[Run gap check]
```

**After the run**

```
(Nothing blocks this claim) (3 to fix) (2 passed)
┌ [SHOULD FIX] Anaesthesia record not signed ───────────────────────────────────┐
│ Insurer SYN-07 returns surgical claims with an unsigned anaesthesia record.   │
│ A signature request has gone to Dr. S. Menon.                                 │
│ source: anaesthesia_record.jpg · page 1 (scanned)       (teal mono)           │
└───────────────────────────────────────────────────────────────────────────────┘
┌ [PASSED] Diagnosis matches the procedure ─────────────────────────────────────┐
│ K80.2 is an accepted diagnosis for laparoscopic cholecystectomy.              │
│ source: opd_consultation.pdf · page 1                                         │
└───────────────────────────────────────────────────────────────────────────────┘
┌ Claim packet ─────────────────────────────────────────────────── [READY] ────┐
│ Payer format: Insurer SYN-07 JSON · 6 attachments · clinical summary needs a  │
│ quick human read.                                                             │
│ [Download packet] [Download gap report]                                       │
│ { "assembly_id": "pa-41d0…", "target_format": "payer_json", … } (dev only)   │
└───────────────────────────────────────────────────────────────────────────────┘
[Next: integrity check →]
```

Order: blocking first (red `BLOCKS CLAIM`), then `SHOULD FIX` (amb), then `PASSED` (ok). A fixed item shows `FIXED` (ok) and "Resolved by Dr. S. Menon at 11:42."

## 4. Content and states

| State | UI |
|---|---|
| Not uploaded | `EmptyStep` → step 1 |
| Ready to run | Explanation + Run gap check |
| Before running: missing claim fields | Short form (payer, service date, subscriber, provider) pre-filled from `POST /claims/intake/extract`; the user confirms, then runs |
| Running | Button spinner "Checking…"; the call can take several seconds |
| Done, packet built | Summary pills, gap list, packet card `READY` |
| Done, hard rejection (`REJECTED_GAPS`) | Red pill "1 blocks this claim"; packet card shows "Gap report ready" instead of a packet, with Download gap report |
| Quarantined sections | Note: "Some sections need a human read before sending" (`quarantined_sections` > 0) |
| Error | ErrorBox; failed step from intake `failed_step` |

## 5. Interactions

- **Run gap check** → one call to `POST /claims/intake`. That call extracts the facts, runs the gap engine, builds the packet (or gap dossier), **queues the integrity check automatically**, and later opens the review task. Activity: "ran the gap check: 3 to fix, claim packet built".
- Re-running sends a new `Idempotency-Key` and creates a new intake; the desk follows the newest one.
- **Download packet / gap report** → request a download link, then open it.

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| POST | `/api/v1/claims/intake/extract` | READY | `{ file_ids[], billing?, service_date?, user_id }` → facts with citations (preview; nothing is created). Pre-fills the confirm form. |
| POST | `/api/v1/claims/intake` | READY | The extract body + `{ encounter_id, claim_id, payer_id, payer_name, target_format?, region?, plan_id?, subscriber, provider, consent?, facts? }` → `201 ClaimIntakeOut { intake_id, status, failed_step, error_code, identity_check, gap_run_id, packet_id, integrity_run_id, pipeline, … }` |
| GET | `/api/v1/claims/gaps/runs/{run_id}` | READY | Findings, each with severity and source chunk / page |
| GET | `/api/v1/claims/gaps/runs/{run_id}/report` | READY | Gap report download link |
| GET | `/api/v1/claims/packets/assemblies/{assembly_id}` | READY | Packet status, outcome, format, attachments |
| GET | `/api/v1/claims/packets/assemblies/{assembly_id}/download` | READY | Packet download link |
| GET | `/api/v1/claims/registry/diseases?q=` | READY | Diagnosis lookup (show the ICD-10 name next to a code) |

Lower-level alternative (not needed for the desk): `POST /claims/gaps/evaluate` then `POST /claims/packets/assemble` with `gap_run_id`.

## 7. Data mapping

| API | UI |
|---|---|
| Finding severity hard / soft / pass | `BLOCKS CLAIM` red / `SHOULD FIX` amb / `PASSED` ok |
| Finding title, message | Bold title, muted text |
| Finding source `original_filename`, `page_number`, OCR | "source: anaesthesia_record.jpg · page 1 (scanned)" |
| Rule reference (when no document) | "Missing document · payer rule SYN-07/R-12" |
| Assembly `status` `COMPLETED` / `QUARANTINED` / `REJECTED_GAPS` | `READY` / `NEEDS A READ` / gap report only |
| `target_format`, attachment count | "Payer format: Insurer SYN-07 JSON · 6 attachments" |
| `identity_check` `MISMATCH` | Red note "The patient in the documents doesn't match the policy holder" |

Confirm the finding field names from `app/features/f004_claims_rulebook/gap_engine/schemas.py` when building.

## 8. Components

S00: `Pill`, `Chip`, `Card`, `Button`, `ErrorBox`, `EmptyStep`. New in `features/gaps/components/`: `GapSummaryPills`, `GapItem`, `PacketCard`, `ClaimDetailsConfirmForm`.

## 9. Files to create

```
src/features/gaps/
  api/intakeApi.js  gapsApi.js  packetsApi.js
  hooks/useRunIntake.js  useGapRun.js  usePacket.js  useDownloadLink.js
  components/GapSummaryPills.jsx  GapItem.jsx  PacketCard.jsx  ClaimDetailsConfirmForm.jsx
  utils/gapView.js  gapView.test.js     finding → { chip, tone, source text }, sorted
src/features/claim-desk/steps/CheckGapsStep.jsx
```

## 10. Acceptance criteria

1. With the prototype data, the list shows 3 `SHOULD FIX` then 2 `PASSED`, with pills "Nothing blocks this claim · 3 to fix · 2 passed".
2. A hard rejection shows the red pill and the gap report instead of a packet.
3. A fixed to-do (S08) turns its gap item to `FIXED` with who and when.
4. Both downloads open the link the API returns; the link is never stored.
5. The JSON snippet in the packet card is visible only with the API panel on.

## 11. Backend gaps and open questions

- "Fixed" state of a gap item needs the to-do link (NEEDED `/tasks`, see S08). Until then gap items are never shown as fixed.
- Where the confirm-form values (payer, policy, subscriber) come from long term: the claim record (`GET /claims/{id}`, NEEDED).

## 12. Build prompt for Claude

> Build S03.4 from `docs/02 - Admin/Claim Desk/desk_check_gaps_S03.4.md`. Pre-fill the confirm form with `POST /api/v1/claims/intake/extract`, run with `POST /api/v1/claims/intake`, then show findings from `GET /claims/gaps/runs/{gap_run_id}` and the packet from `GET /claims/packets/assemblies/{packet_id}`. Check the real finding fields in the backend schemas first and put the mapping in a tested `gapView.js`. Meet section 10, then run lint, tests and build.
