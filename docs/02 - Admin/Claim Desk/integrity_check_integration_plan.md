# S03.5 — Claim Desk Step 4/5: Integrity Check Integration Plan

> **Status:** Planning · **Screen:** S03.5 (`/claims/:claimId/integrity`) · **Role:** Admin (`integrity:view`)  
> **Comes after:** Check gaps & claim packet (`docs/check_gaps_integration_plan.md`)  
> **Next step:** S03.6 Approve & submit (`docs/02 - Admin/Claim Desk/desk_approve_submit_S03.6.md`)

---

## 1. Purpose & Overview

The **Integrity Check** inspects the assembled claim packet for fraud, document tampering, duplication, and unusual billing signals before final approval.

### Crucial Architectural Note:
When the user executes **Step 3 Check Gaps** (`POST /api/v1/claims/intake`), the backend intake pipeline **automatically queues the integrity check** in the background:
```
POST /claims/intake 
  → builds packet (packet_id)
  → queues integrity run (integrity_run_id) ◄── Returned in ClaimIntakeOut
```
Therefore, in standard workflow, **Step 4/5 Integrity does NOT need to manually trigger `POST /integrity/check`**. It simply consumes `integrity_run_id` (passed via URL `?intake=` or desk state) and polls `GET /api/v1/integrity/runs/{run_id}` until `status === 'COMPLETED'`.

A manual fallback button ("Run integrity check") is retained solely for legacy packets or re-running failed checks.

---

## 2. Permissions & Security

* **Access:** Admin only (`integrity:view`).
* **Compliance note:** Visible to administrators only. Doctors, hospital staff, and patients never see this screen or fraud flags (they only see that a claim is "Under review" or "On hold").
* Displays prominent plum security banner:
  > *Visible to admins only. Doctors and staff only see that a claim is on hold.*

---

## 3. UI Layout & Visual Specifications

```
┌ Integrity check ───────────────────────────────────── Runs on the claim packet ┐
│ ┌ plum note: Visible to admins only. Doctors and staff only see that a claim is on hold. ┐ │
│                                                                                 │
│ A. Summary Pills: (5 passed) (1 to check) (0 failed)                            │
│                                                                                 │
│ B. Checks Findings List:                                                        │
│ ┌ [PASSED] Duplicate documents                                 EXACT_DUPE (dev) ┐
│ │ No identical copy of these files in earlier claims. One duplicate inside this  │
│ │ upload was already set aside.                                                 │
│ └───────────────────────────────────────────────────────────────────────────────┘
│ ┌ [CHECK] Document tampering                                    TAMPERING (dev) ┐
│ │ anaesthesia_record.jpg was re-saved by an editing app after scan date. Often  │
│ │ harmless (rotated or cropped); check before approving.                        │
│ │ [View file text / forensics]                                                  │
│ └───────────────────────────────────────────────────────────────────────────────┘
│                                                                                 │
│ C. Degraded note (if degraded_checks > 0): "1 check ran with limited data"      │
│                                                                                 │
│ [ Next: approve & submit → ]                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints Referenced

All endpoints are live under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/integrity/runs/{run_id}` | Poll integrity run status, overall flag, and individual `checks[]` |
| `GET` | `/api/v1/integrity/checks/{packet_id}` | Lookup latest run if only `packet_id` is known |
| `POST` | `/api/v1/integrity/check` | Manual trigger fallback: `{ packet_id }` → `202 { run_id, status }` |
| `GET` | `/api/v1/integrity/files/{file_id}` | Detailed image/PDF forensics for tampering flags |

---

## 5. Data Mapping & Status Mapping

### 5.1 Run Status (`run.status`)
* `QUEUED` / `PROCESSING`: Display loading spinner with text *"Checking… usually under a minute"* and poll every 3 seconds.
* `COMPLETED`: Render summary pills and the checks list.
* `FAILED_SYSTEM`: Display `ErrorBox` with *"The integrity check could not finish"* and a "Run again" retry button.

### 5.2 Overall Outcome (`overall_flag`)
* `PASS` (tone: `ok`): Clean packet.
* `SOFT_WARN` (tone: `amb`): Minor warnings (tampering, resubmission check recommended).
* `HARD_FAIL` (tone: `red`): Critical fraud signals / exact claim duplication.

### 5.3 Check Types (`checks[].check_type`)

| Backend `check_type` | UI Display Label | Description / Focus |
|---|---|---|
| `EXACT_DUPE` | Duplicate documents | Identical file hashes across previous claims |
| `SEMANTIC_DUPE` | Resubmitted claim | Similar diagnosis, procedure, and service dates |
| `FUZZY_MATCH` | Pre-existing condition / Identity match | Policyholder identity consistency |
| `TAMPERING` | Document tampering | EXIF/metadata modification after scan date |
| `ID_VERIFY` | Policy and ID checks | Member ID and hospital license validation |
| `ANOMALY` | Unusual billing | Outlier tariffs or billing spikes |

### 5.4 Result Flag (`checks[].result_flag`)
* `PASS` → Chip `[PASSED]` (green/ok tone)
* `SOFT_WARN` → Chip `[CHECK]` (amber tone)
* `HARD_FAIL` → Chip `[FAILED]` (red tone)

---

## 6. Implementation Task List

| Task ID | Description | Target Files |
|---|---|---|
| **INT-01** | **Hook `useIntegrityRun(runId)`**: React Query polling hook that polls `GET /integrity/runs/{runId}` every 3 seconds while status is `QUEUED` or `PROCESSING`. | `src/features/integrity/hooks/useIntegrityRun.js` |
| **INT-02** | **Component `IntegritySummaryPills`**: Computes and displays `N passed`, `N to check`, and `N failed` chips from `checks[]`. | `src/features/integrity/components/IntegritySummaryPills.jsx` |
| **INT-03** | **Component `IntegrityCheckRow`**: Renders each check item with mapped title, flag chip, descriptive summary, and dev code pill. | `src/features/integrity/components/IntegrityCheckRow.jsx` |
| **INT-04** | **Step Refactor `IntegrityStep.jsx`**: Wire real data from `useIntegrityRun(integrityRunId)` (read from URL `?intake=` / desk store). Remove hardcoded `PROTOTYPE_INTEGRITY`. Support manual run fallback. | `src/features/claim-desk/steps/IntegrityStep.jsx` |
| **INT-05** | **Hand-off to Step 5/6 Approve & Submit**: Forward URL parameters (`?batch=`, `?intake=`) to `/claims/:claimId/approve` and sync `desk.integrityRun: true`. | `src/features/claim-desk/steps/IntegrityStep.jsx` |

---

## 7. Acceptance Criteria

1. [ ] Step 4/5 opens with `integrityRunId` automatically discovered from the intake record (`?intake=`).
2. [ ] While `status === 'PROCESSING'`, shows progress indicator and auto-polls every 3s until `COMPLETED`.
3. [ ] If no integrity run was queued, offers "Run integrity check" calling `POST /integrity/check`.
4. [ ] All 6 check types (`EXACT_DUPE`, `TAMPERING`, `SEMANTIC_DUPE`, etc.) map to human-readable titles.
5. [ ] Summary counts correctly aggregate `PASS`, `SOFT_WARN`, and `HARD_FAIL`.
6. [ ] Clicking "Next: approve & submit →" navigates to `/claims/:claimId/approve` with query state intact.
7. [ ] Both `npm run build` and `npm run lint` pass cleanly.

