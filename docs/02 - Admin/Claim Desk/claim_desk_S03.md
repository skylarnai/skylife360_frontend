# S03 — Claim desk (shell)

| Field | Value |
|---|---|
| Screen | S03 — Work on a claim: header, step navigation, rails. The steps themselves are S03.1–S03.6. |
| Role | Admin |
| Route | `/claims/:claimId/:step` where `step` is `upload · read · ask · gaps · integrity · approve`. `/desk` (the "Work on a claim" tab) opens the last claim worked on, or the worklist if none. |
| Prototype reference | `viewDesk()` header, `STG`, stage nav, `apiRail()` + `activityRail()` |
| Depends on | S00, S01, S02 |
| Next screens that depend on this | S03.1–S03.6 |
| Status | Planned |
| API readiness | Mostly READY. The claim header needs `GET /claims/{id}` (**NEEDED**); until then it is built from the intake record and a mock. |

## 1. Purpose

One workspace that walks one claim from uploaded documents to submission in six steps, always showing who the patient and payer are, how much the claim is worth, where it stands, and what is left to fix.

## 2. Users and permissions

Admin. Each step checks its own permission (`files:upload`, `rag:ask`, `gaps:run`, `integrity:view`, `claims:approve`, `claims:submit`). A step the user cannot act on is shown read-only.

## 3. Layout

```
┌ claim header card ──────────────────────────────────────────────────────────────────┐
│ SUV-261028-01 · Private cashless (mono, accent)                         ₹1,48,600    │
│ Laparoscopic cholecystectomy (h1 22px)                       ESTIMATED CLAIM VALUE   │
│ Patient SYN-P-1042 · F · 46   Payer Insurer SYN-07 via TPA SYN-3                     │
│ Policy POL-SYN-77120   Treating doctor Dr. S. Menon     [Waiting for approval] [3 to fix] │
└──────────────────────────────────────────────────────────────────────────────────────┘
┌1 · Upload────┐┌2 · Read documents┐┌3 · Ask──────────┐┌4 · Check gaps─────┐┌5 · Integrity──────┐┌6 · Approve & submit┐
│files or a ZIP││text and scans    ││questions w/ src ││payer rules, packet││duplicates, IDs    ││sign off, send      │
└──────────────┘└──────────────────┘└─────────────────┘└───────────────────┘└───────────────────┘└────────────────────┘
  current = accent fill, white text · done = accent border · not reached = muted
┌ main card (step body, aria-live="polite") ─────────────┐ ┌ rail ───────────────────┐
│  <S03.x step component>                                 │ │ API for this screen     │
│                                                         │ │ (per step, dev only)    │
│  [Next: read documents →]                               │ │ Activity · audit        │
└─────────────────────────────────────────────────────────┘ └─────────────────────────┘
```

Step buttons: grid `auto-fit, minmax(150px, 1fr)`, 52px tall; each is a link to its route.

## 4. Content and states

### Header status pill (the furthest state reached wins)

| Condition | Text | Tone |
|---|---|---|
| No files yet | Waiting for documents | teal |
| Uploaded, some file failed to read | 1 file couldn't be read | red |
| Uploaded, all read | Documents ready | teal |
| Packet built | Claim packet ready | teal |
| Integrity done, review open | Waiting for approval | amb |
| Decision `REJECTED` | Sent back to hospital | red |
| Decision `APPROVED` / `FALSE_POSITIVE` | Approved | ok |
| Submission `SUBMITTED` | Submitted to TPA SYN-3 | ok |

A second amber pill "N to fix" shows while soft gaps remain and the claim is not submitted.

### Step reachability

| Step | Reachable when | Otherwise shows |
|---|---|---|
| 1 Upload | always | — |
| 2 Read, 3 Ask | at least one batch uploaded | "Nothing uploaded yet. Go to step 1." |
| 4 Gaps | uploaded | same |
| 5 Integrity | packet built | "Build the claim packet first. Go to step 4." |
| 6 Approve | integrity run `COMPLETED` | "Run the integrity check first. Go to step 5." |

Steps are never locked: the user can always open any step, and an unreached step shows the "do step N first" box (`EmptyStep`).

## 5. Interactions

- Step buttons and every "Next: … →" button change the route. Browser Back moves between steps.
- The desk keeps one claim state object (`useClaimDesk(claimId)`) built from the API calls below. Each step reads it and invalidates it after a write.
- Every step action adds an activity line ("uploaded batch: 7 ingested, 1 duplicate, 1 rejected").

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/claims/{claim_id}` | **NEEDED** | Header: claim number, scheme, procedure, patient (ID, sex, age), payer, TPA, policy, doctor, estimated amount, stage, linked `batch_ids`, `intake_id` |
| GET | `/api/v1/claims/intake/{intake_id}` | READY | `status`, `gap_run_id`, `packet_id`, `integrity_run_id`, and `pipeline` (live: packet, integrity run, review task, submission). The source of truth for step reachability. |
| GET | `/api/v1/ingestion/batches/{batch_id}` | READY | Upload and read status for steps 1–2 |

The per-step endpoints are in each S03.x doc.

## 7. Data mapping

| Source | UI |
|---|---|
| `claim.claim_id` + `claim.scheme` | "SUV-261028-01 · Private cashless" |
| `claim.procedure_name` | h1 |
| `claim.patient.{user_id, sex, age}` | "SYN-P-1042 · F · 46" |
| `claim.payer_name` + `claim.tpa_name` | "Insurer SYN-07 via TPA SYN-3" |
| `claim.estimated_amount` | ₹1,48,600 |
| `intake.pipeline` | Status pill, step done marks |

## 8. Components

S00: `Card`, `Pill`, `TwoColumn`, `ApiRail`, `ActivityRail`, `EmptyStep`. New in `features/claim-desk/components/`: `ClaimHeader`, `StepNav`, `StepButton`, `NextStepButton`, `DeskLayout` (header + nav + two columns, renders `<Outlet/>` for the step).

## 9. Files to create

```
src/features/claim-desk/
  pages/ClaimDeskLayout.jsx           route element for /claims/:claimId/*
  components/ClaimHeader.jsx  StepNav.jsx  NextStepButton.jsx
  hooks/useClaimDesk.js               combines claim + intake + batch queries, derives status and reachability
  constants.js                        STEPS = [{ key: 'upload', title: 'Upload', sub: 'files or a ZIP' }, …]
  utils/deskStatus.js                 pure function: (claim, intake, batch, review, submission) → { text, tone, reached[] }
  utils/deskStatus.test.js            one test per row of the status table in section 4
```

## 10. Acceptance criteria

1. The header and step bar match the prototype at 1280px; at 375px the step buttons wrap into two columns.
2. `deskStatus()` returns the right text and tone for every row of the section 4 table (unit tests).
3. Opening any step by URL works, including steps not reached yet (they show `EmptyStep`).
4. Back / Forward move between steps.
5. The rail shows the API list of the current step only when the API panel is on.

## 11. Backend gaps and open questions

- **NEEDED:** `GET /api/v1/claims/{claim_id}` (claim header) and a link from claim to its batches and intake.
- Until then: build the header from a mock, and keep `batch_id` and `intake_id` in the URL search params (`?batch=…&intake=…`) so the steps can still use the real READY endpoints.

## 12. Build prompt for Claude

> Build S03 (the claim desk shell) from `docs/02 - Admin/Claim Desk/claim_desk_S03.md`. Add nested routes for the six steps, each rendering a placeholder until its S03.x doc is built. Implement `deskStatus()` with unit tests for every row of section 4. Use a mock for `GET /claims/{id}` and the real `GET /claims/intake/{id}` and `GET /ingestion/batches/{id}` when their IDs are in the URL. Run lint, tests and build.
