# Integrity Check (Claim Desk Step 4/5) — Integration Plan

> **Status:** Planning · **Screen:** S03.5 (`/claims/:claimId/integrity`) · **Role:** Admin (`integrity:view`)  
> **Comes after:** Check gaps (`docs/check_gaps_integration_plan.md`) · **Precedes:** Approve & submit (`docs/02 - Admin/Claim Desk/desk_approve_submit_S03.6.md`)  
> **Reference docs:** [`docs/02 - Admin/Claim Desk/desk_integrity_S03.5.md`](docs/02%20-%20Admin/Claim%20Desk/desk_integrity_S03.5.md), [`docs/02 - Admin/claims_worklist_S02.md`](docs/02%20-%20Admin/claims_worklist_S02.md), [`docs/02 - Admin/users_access_S04.md`](docs/02%20-%20Admin/users_access_S04.md)

---

## 1. What This Step Does & How It Connects

The **Integrity Check** inspects the assembled claim packet for fraud, document tampering, duplicate claims, identity mismatches, and abnormal billing before final sign-off.

### End-to-End Pipeline Context:
```
Step 1: Upload (Batch upload, virus scan, duplicate hash detection)
  ↓
Step 2: Read Documents (Text extraction & OCR, polling is_complete)
  ↓
Step 3: Check Gaps (POST /claims/intake)
  ├── 1. Generates Claim Packet (packet_id)
  └── 2. Automatically queues Integrity Run (integrity_run_id) ◄── Already done!
        ↓
Step 4/5: Integrity Check (This step)
  └── Polls GET /integrity/runs/{integrity_run_id} until COMPLETED
        ↓
Step 5/6: Approve & Submit (Adjudicate flags: approve, false alarm, or reject)
```

> [!IMPORTANT]
> Because **`POST /api/v1/claims/intake`** in Step 3 automatically queues the integrity run in the backend, **Step 4/5 normally does NOT call `POST /integrity/check`**. It simply reads `integrity_run_id` from the intake (via URL `?intake=` or desk store) and auto-polls `GET /api/v1/integrity/runs/{run_id}`.

---

## 2. Permissions & Role Matrix (from `users_access_S04.md`)

As defined in [`users_access_S04.md`](docs/02%20-%20Admin/users_access_S04.md):
* **Admin (`integrity:view`):** Full access to view integrity findings and fraud signals.
* **Doctor / Hospital Staff:** **Never see integrity findings**. They only see that a claim is "Under review" or "On hold".
* The UI displays the security disclaimer banner:
  > *"Visible to admins only. Doctors and staff only see that a claim is on hold."*

---

## 3. UI Layout & Visual Progression

### 3.1 Unreached State (Packet not built yet)
As seen in the screenshot, if the claim has not yet run Step 3 (Check Gaps), it displays:
```
┌ Integrity check ───────────────────────────────────── Runs on the claim packet ┐
│ ┌ plum note: Visible to admins only. Doctors and staff only see that a claim is on hold. ┐ │
│ ┌ EmptyStep ──────────────────────────────────────────────────────────────────┐ │
│ │ Build the claim packet first. Go to step 3/4.                               │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Processing State
When `status === 'QUEUED'` or `status === 'PROCESSING'`:
* Inline spinner with text: *"Checking… usually under a minute"*
* Auto-polls `GET /api/v1/integrity/runs/{run_id}` every 3 seconds.

### 3.3 Completed State
```
┌ Integrity check ───────────────────────────────────── Runs on the claim packet ┐
│ ┌ plum note: Visible to admins only. Doctors and staff only see that a claim is on hold. ┐ │
│                                                                                 │
│ ( 5 passed )  ( 1 to check )  ( 0 failed )                                      │
│                                                                                 │
│ ┌ [PASSED] Duplicate documents                                 EXACT_DUPE (dev) ┐
│ │ No identical copy of these files in earlier claims. One duplicate inside this  │
│ │ upload was already set aside.                                                 │
│ └───────────────────────────────────────────────────────────────────────────────┘
│ ┌ [CHECK] Document tampering                                    TAMPERING (dev) ┐
│ │ anaesthesia_record.jpg was re-saved by an editing app after the scan date.     │
│ │ Often harmless (rotated or cropped); check before approving.                  │
│ │ [View file text / forensics]                                                  │
│ └───────────────────────────────────────────────────────────────────────────────┘
│                                                                                 │
│ [ Next: approve & submit → ]                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints Referenced

All endpoints are live under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/integrity/runs/{run_id}` | Poll integrity status, overall outcome, and checks list |
| `GET` | `/api/v1/integrity/checks/{packet_id}` | Lookup latest run when only `packet_id` is available |
| `POST` | `/api/v1/integrity/check` | Manual trigger fallback (`{ packet_id }` → `202 { run_id }`) |
| `GET` | `/api/v1/integrity/files/{file_id}` | Detailed forensics for tampering findings |

---

## 5. Data Mapping & Status Handling

### 5.1 Check Types (`checks[].check_type`)

| Backend Code | UI Label | What it Checks |
|---|---|---|
| `EXACT_DUPE` | Duplicate documents | File SHA-256 hash duplication against past claims |
| `SEMANTIC_DUPE` | Resubmitted claim | Prior claims with identical diagnosis, doctor, and dates |
| `FUZZY_MATCH` | Pre-existing condition / Identity match | Patient name and birth date match policy holder |
| `TAMPERING` | Document tampering | EXIF/metadata edits or re-saves after document creation |
| `ID_VERIFY` | Policy and ID checks | Policy format and hospital provider license verification |
| `ANOMALY` | Unusual billing | Outlier billing amounts against hospital tariff |

### 5.2 Result Flags (`checks[].result_flag`)
* `PASS` → Chip `[PASSED]` (green/ok tone)
* `SOFT_WARN` → Chip `[CHECK]` (amber tone)
* `HARD_FAIL` → Chip `[FAILED]` (red tone)

---

## 6. Frontend Tasks for Implementation

| ID | Task | Target Files |
|---|---|---|
| **INT-01** | **`useIntegrityRun(runId)` Hook:** React Query hook polling `GET /integrity/runs/{runId}` every 3s while `status` is `QUEUED` or `PROCESSING`. | `src/features/integrity/hooks/useIntegrityRun.js` |
| **INT-02** | **`IntegritySummaryPills` Component:** Calculates and renders `N passed`, `N to check`, and `N failed` chips from real `checks[]`. | `src/features/integrity/components/IntegritySummaryPills.jsx` |
| **INT-03** | **`IntegrityCheckRow` Component:** Renders each check with human title, result chip, detailed explanation, and dev code tag. Connects to `useOpenFile` to view document text on click. | `src/features/integrity/components/IntegrityCheckRow.jsx` |
| **INT-04** | **Step Refactor `IntegrityStep.jsx`:** Replace demo constants (`PROTOTYPE_INTEGRITY`). Read `integrityRunId` from intake (`?intake=`). Support manual fallback (`POST /integrity/check`) if no run exists. | `src/features/claim-desk/steps/IntegrityStep.jsx` |
| **INT-05** | **Hand-off to Step 5/6 Approve & Submit:** Preserves URL query parameters (`?batch=`, `?intake=`) when clicking "Next: approve & submit →" and updates `desk.integrityRun: true`. | `src/features/claim-desk/steps/IntegrityStep.jsx` |

---

## 7. Acceptance Criteria

1. [ ] If no packet or intake exists, displays `EmptyStep` (*"Build the claim packet first. Go to step 3/4."*).
2. [ ] If `integrityRunId` is present from the intake, automatically starts polling until `status === 'COMPLETED'`.
3. [ ] If no run was queued, provides "Run integrity check" button calling `POST /integrity/check`.
4. [ ] All check codes map cleanly to readable titles (no raw enum keys in production UI).
5. [ ] Screen reflects `degraded_checks > 0` with an amber warning note if any check ran with limited data.
6. [ ] Clicking "Next: approve & submit →" navigates to `/claims/:claimId/approve` with query state preserved.
7. [ ] Both `npm run build` and `npm run lint` pass with 0 errors.

