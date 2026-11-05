# Approve & Submit (Claim Desk Step 5/6) — Integration Plan

> **Status:** Planning · **Screen:** S03.6 (`/claims/:claimId/approve`) · **Role:** Admin (`claims:approve`, `claims:submit`)  
> **Comes after:** Integrity check ([`integrity_check_integration_plan.md`](integrity_check_integration_plan.md))  
> **Reference docs:** [`docs/02 - Admin/Claim Desk/desk_approve_submit_S03.6.md`](../desk_approve_submit_S03.6.md), [`docs/02 - Admin/claims_worklist_S02.md`](../../claims_worklist_S02.md), [`docs/02 - Admin/users_access_S04.md`](../../users_access_S04.md)

---

## 1. Purpose & Workflow Overview

**Step 5/6 (Approve & Submit)** is the final human-in-the-loop checkpoint before the assembled claim packet is dispatched to the payer or TPA. 

A claim reviewer or admin examines everything discovered in the prior steps, adjudicates open warnings, confirms the decision with a rationale when required, and dispatches the claim packet to the external payer system.

```
Step 4/5: Integrity Check (COMPLETED)
  ↓
Step 5/6: Review Task Open (GET /reviews/{task_id} from intake.pipeline)
  ├── 1. Pre-Approval Checklist (Documents, Gaps to fix, Blockers, Integrity signals)
  ├── 2. Adjudication Form (Approve / False Positive / Send Back)
  │     └─ POST /api/v1/reviews/{task_id}/adjudicate (with version lock)
  └── 3. Dispatch to Payer
        ├─ POST /api/v1/claims/submissions (with Idempotency-Key)
        └─ Poll GET /api/v1/claims/submissions/{id}: QUEUED → DISPATCHING → SUBMITTED
```

---

## 2. Permissions & Security

* **Permissions required:**
  * `claims:approve` — To confirm decision (Approve, False Alarm, Reject).
  * `claims:submit` — To trigger submission to payer / TPA.
* **Without permissions:** Screen renders read-only (checklist and current decision/submission status only).
* **Multi-user concurrency protection:** Uses optimistic version locking (`version` field). Stale versions receive HTTP `409` (*"Someone else decided this claim while you were working. Reload to see their decision."*).

---

## 3. UI Layout & Visual Specifications

### 3.1 Initial State (Pre-Approval Checklist & Decision Form)
```
┌ Approve and submit ──────────────────────── A person signs off every claim before it goes to the payer ┐
│                                                                                                         │
│ ┌ Before you approve ─────────────────────────┐  ┌ Decision ──────────────────────────────────────────┐ │
│ │ (✓) 6 of 6 documents read                   │  │ ( ) Approve                                        │ │
│ │ (!) 3 to fix: anaesthesia record not signed,│  │ ( ) Approve · integrity warning is a false alarm   │ │
│ │     policy schedule not uploaded...         │  │ ( ) Send back to the hospital                      │ │
│ │ (✓) Nothing blocks this claim               │  │                                                    │ │
│ │ (!) Integrity: 1 warning (tampering)        │  │ Reason (required for false alarms or send back)    │ │
│ │                                             │  │ [ e.g., Image was rotated by records staff... ]    │ │
│ └─────────────────────────────────────────────┘  │ [ Confirm decision ]                               │ │
│                                                  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Post-Approval State (Submission Dispatch Tracker)
```
┌ Approved by A. Rao · integrity warning marked as a false alarm ─────────────────────────────────────────┐
│ Reason: Image was rotated by records staff                                                              │
│ [ Submit to TPA SYN-3 ]                                                                                 │
│                                                                                                         │
│ After click:                                                                                            │
│ ┌ Queued ────────┐  ┌ Dispatching ────┐  ┌ Received by TPA SYN-3 ┐                                     │
│ └────────────────┘  └─────────────────┘  └───────────────────────┘                                     │
│ Payer reference: SYN3-CLM-88214. If payer returns rejection, reasons will appear here.                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints Referenced

All endpoints are live under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/claims/intake/{intake_id}` | Source of truth: reads `pipeline.review.task_id` and `pipeline.submission` |
| `POST` | `/api/v1/reviews` | Fallback: `{ packet_id }` opens review task if pipeline hasn't opened one |
| `GET` | `/api/v1/reviews/{task_id}` | Fetches `ReviewTaskDetail` (`version`, `status`, `blockers`, `flags`, `rationale_min_chars`) |
| `POST` | `/api/v1/reviews/{task_id}/adjudicate` | Adjudicates review: `{ version, decision, rationale, false_positive_checks[], gap_report_recipients[] }` |
| `POST` | `/api/v1/claims/submissions` | Dispatches submission: `{ packet_id }` + `Idempotency-Key` → `202 { submission_id }` |
| `GET` | `/api/v1/claims/submissions/{submission_id}` | Polls submission status (`QUEUED` → `DISPATCHING` → `SUBMITTED`) and payer reference |
| `POST` | `/api/v1/claims/submissions/{submission_id}/requeue` | Requeues a failed submission attempt |
| `GET` | `/api/v1/claims/gap-reports/{gap_report_id}` | Fetches gap dossier generated when decision is `REJECTED` |

---

## 5. Decision Rules & Validation

1. **Blockers (`blockers[]` not empty or `hard_rejections > 0`):**
   * "Approve" and "Approve (false alarm)" options are **disabled**.
   * Only **"Send back to the hospital"** is permitted.
2. **Rationale Requirements:**
   * If `decision === 'FALSE_POSITIVE'`: Rationale is required (minimum `rationale_min_chars` or 10 characters). Automatically populates `false_positive_checks` with soft warn check types (e.g. `["TAMPERING"]`).
   * If `decision === 'REJECTED'`: Rationale is required. Populates `gap_report_recipients` (e.g. treating doctor).
   * If `decision === 'APPROVED'`: Rationale is optional.
3. **Submission Polling (`status`):**
   * Polls `GET /claims/submissions/{submission_id}` every 3 seconds while `QUEUED` or `DISPATCHING`.
   * Stops polling on `SUBMITTED` or `FAILED`.

---

## 6. Frontend Tasks for Implementation

| ID | Task | Target Files |
|---|---|---|
| **APP-01** | **`useReviewTask(taskId, packetId)` Hook:** Loads review task by ID from intake pipeline; falls back to `openReviewTask(packetId)` if task not yet opened. | `src/features/review/hooks/useReviewTask.js` |
| **APP-02** | **`useSubmission(submissionId)` Hook:** Polls `GET /claims/submissions/{submissionId}` every 3s while status is `QUEUED` or `DISPATCHING`. | `src/features/review/hooks/useSubmission.js` |
| **APP-03** | **Component `PreApprovalChecklist`:** Real dynamic checklist aggregating document readiness, open gap counts, blocker status, and integrity warnings. | `src/features/review/components/PreApprovalChecklist.jsx` |
| **APP-04** | **Component `AdjudicationForm`:** Radio selection for decisions, mandatory rationale validation, and version-safe submission to `POST /reviews/{taskId}/adjudicate`. | `src/features/review/components/AdjudicationForm.jsx` |
| **APP-05** | **Component `SubmissionTracker`:** Three-stage visual progress stepper (`Queued` → `Dispatching` → `Received by {Payer}`) displaying payer reference on completion. | `src/features/review/components/SubmissionTracker.jsx` |
| **APP-06** | **Step Refactor `ApproveSubmitStep.jsx`:** Replace prototype arrays (`PROTOTYPE_GAPS`, fake decisions). Integrate live queries and mutations. Sync status to header pill and desk store. | `src/features/claim-desk/steps/ApproveSubmitStep.jsx` |

---

## 7. Acceptance Criteria

1. [ ] If integrity check has not completed, displays `EmptyStep` (*"Run the integrity check first. Go to step 4/5."*).
2. [ ] Reads `task_id` dynamically from intake pipeline; loads live `ReviewTaskDetail`.
3. [ ] If blockers exist (`hard_rejections > 0`), Approve radio options are disabled.
4. [ ] Rationale is strictly validated according to `rationale_min_chars` when overriding flags or rejecting.
5. [ ] Adjudicating updates task version, logs activity, and renders confirmed decision card.
6. [ ] Clicking "Submit to {Payer}" creates a submission with `Idempotency-Key` and polls status until `SUBMITTED`.
7. [ ] Both `npm run build` and `npm run lint` pass with 0 errors.

