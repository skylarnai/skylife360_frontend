# S03.6 — Claim desk step 6: Approve and submit

| Field | Value |
|---|---|
| Screen | S03.6 — Approve and submit (human sign-off, then send to the payer) |
| Role | Admin (`claims:approve`, `claims:submit`); integrity clearance can be Compliance (`integrity:clear`) |
| Route | `/claims/:claimId/approve` |
| Prototype reference | `viewDesk()` with `step === 5`, actions `decide`, `undoDecision`, `submit` |
| Depends on | S03.5 (integrity `COMPLETED`, review task open) |
| Status | Planned |
| API readiness | READY |

## 1. Purpose

A person signs off every claim before it goes to the payer: they see what is still open, choose Approve, Approve with the integrity warning marked as a false alarm, or Send back to the hospital, give a reason when needed, and then submit and follow the submission until the payer receives it.

## 2. Users and permissions

`claims:approve` to decide, `claims:submit` to submit. Without them the step is read-only (decision and submission status only).

## 3. Layout

```
Approve and submit                         A person signs off every claim before it goes to the payer
┌ Before you approve ─────────────────────┐ ┌ Decision ───────────────────────────────────────┐
│ (✓) 6 of 6 documents read                │ │ ( ) Approve                                      │
│ (!) 3 to fix: anaesthesia record not     │ │ ( ) Approve · the integrity warning is a false   │
│     signed, policy schedule not uploaded,│ │     alarm                                        │
│     histopathology report pending        │ │ ( ) Send back to the hospital                    │
│ (✓) Nothing blocks this claim            │ │ Reason (required when you override a warning or  │
│ (!) Integrity: 1 warning (tampering)     │ │ send the claim back)                             │
│                                          │ │ [ e.g. Image was rotated by the records team… ]  │
│                                          │ │ [Confirm decision]                               │
└──────────────────────────────────────────┘ └──────────────────────────────────────────────────┘
```

**After Approve**

```
┌ ok pill: Approved by A. Rao · integrity warning marked as a false alarm. ┐
Reason: Image was rotated by the records team…
[Submit to TPA SYN-3]
  ↓ after submit
┌Queued──────┐┌Sending──────┐┌Received by TPA SYN-3┐   (done = ok, current = accent tint)
└────────────┘└─────────────┘└─────────────────────┘
Payer reference SYN3-CLM-88214. If the payer rejects it, it comes back here with their reasons.
```

**After Send back**: red pill "Sent back by A. Rao. A gap report was shared with Dr. S. Menon.", the reason, and [Reopen review].

## 4. Content and states

| State | UI |
|---|---|
| Integrity not completed | `EmptyStep` → step 5 |
| Review task not open yet | "Opening the review…" and poll the intake `pipeline` until it has a task |
| Blockers present (`blockers[]` not empty) | Approve options disabled; checklist shows the blockers in red; only Send back is allowed |
| Deciding | Radio group + reason; Confirm disabled while sending |
| Validation | No choice → "Choose a decision."; reason shorter than `rationale_min_chars` when overriding flags or sending back → "Add a short reason (at least N characters)." |
| `409` stale version | "Someone else decided this claim while you were working. Reload to see their decision." + Reload |
| Approved, not submitted | Approved pill + Submit button |
| Submitting / submitted | Three-step flow `QUEUED → DISPATCHING → SUBMITTED`, polled; payer reference when received |
| Submission failed | Red box with the payer's reason + Requeue |
| Payer rejected later | Red box "Returned by the payer" with reasons (from `/claims/rejections`) |

## 5. Interactions

- **Confirm decision** → adjudicate with the task `version` read on load. `FALSE_POSITIVE` sends `false_positive_checks` = the integrity checks the user is overriding (e.g. `["TAMPERING"]`). `REJECTED` sends `gap_report_recipients` (the treating doctor). Activity: "approved the claim (integrity warning marked false alarm)".
- **Reopen review** (after Send back): only when the backend allows a new decision on the task; otherwise hidden.
- **Submit to {payer}** → create the submission with `Idempotency-Key`; then poll its status every 3s until `SUBMITTED` or a failure. Activity: "submitted the claim to TPA SYN-3".
- **Requeue** → requeue a failed submission.

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| GET | `/api/v1/claims/intake/{intake_id}` | READY | `pipeline` → review `task_id`, submission id |
| POST | `/api/v1/reviews` | READY | `{ packet_id }` → opens the review task (only if the pipeline did not) |
| GET | `/api/v1/reviews/{task_id}` | READY | `ReviewTaskDetail`: `version, status, recommendation, blockers[], flags[], integrity_checks[], hard_rejections, soft_gaps, quarantined_sections, rationale_min_chars, …` |
| POST | `/api/v1/reviews/{task_id}/integrity-clearance` | READY | Clear integrity flags (Compliance split, later) |
| POST | `/api/v1/reviews/{task_id}/adjudicate` | READY | `{ version, decision: APPROVED · REJECTED · FALSE_POSITIVE, rationale?, false_positive_checks[], gap_report_recipients[] }`; stale `version` → `409` |
| POST | `/api/v1/claims/submissions` | READY | `{ packet_id }` + `Idempotency-Key` → `202 { submission_id, packet_id, payer_code, status, replayed, check_status_url }` |
| GET | `/api/v1/claims/submissions/{submission_id}` | READY | Status and payer attempts, payer reference |
| POST | `/api/v1/claims/submissions/{submission_id}/requeue` | READY | Retry a failed dispatch |
| POST | `/api/v1/claims/submissions/{submission_id}/document-link` | READY | Link to the submitted document |
| GET | `/api/v1/claims/gap-reports/{gap_report_id}` | READY | The report sent back to the hospital (after `REJECTED`) |

## 7. Data mapping

| API | UI |
|---|---|
| `blockers[]` | Red checklist lines; disables Approve |
| `flags[]` | Amber checklist lines; reason required to approve over them |
| `integrity_checks[]` with `SOFT_WARN` | "Integrity: N warning (…)"; candidates for `false_positive_checks` |
| `soft_gaps` | "N to fix: …" |
| `rationale_min_chars` | Reason minimum length |
| Submission `status` `QUEUED` / `DISPATCHING` / `SUBMITTED` | Queued / Sending / Received by {payer} |
| `payer_code` | Payer name in the button and flow ("TPA SYN-3") |

## 8. Components

S00: `Button`, `TextArea`, `ErrorBox`, `Pill`, `EmptyStep`. New in `features/review/components/`: `ApprovalChecklist`, `DecisionForm`, `DecisionResult`, `SubmissionFlow`.

## 9. Files to create

```
src/features/review/
  api/reviewsApi.js  submissionsApi.js
  hooks/useReviewTask.js  useAdjudicate.js  useCreateSubmission.js  useSubmission.js (polling)
  components/ApprovalChecklist.jsx  DecisionForm.jsx  DecisionResult.jsx  SubmissionFlow.jsx
  schemas/decisionSchema.js   zod: decision required; rationale ≥ rationale_min_chars when decision ≠ APPROVED or flags exist
src/features/claim-desk/steps/ApproveSubmitStep.jsx
```

## 10. Acceptance criteria

1. Approve without a reason works when there are no flags; with flags or for Send back the reason rule applies (matching the backend's `rationale_min_chars`).
2. With blockers, only Send back can be chosen.
3. A `409` shows the stale-version message and Reload fetches the new version.
4. Submit shows Queued → Sending → Received with the payer reference, polling stops at the end, and a double click does not create two submissions (same `Idempotency-Key`).
5. The reviewer's name on the result comes from the session user.

## 11. Backend gaps and open questions

- The audit log stores `client_id`, not the person, until the auth module adds `actor_id`. The UI shows the session user's name; the server record must catch up.
- "Reopen review" depends on whether the backend allows a second decision on a task. If it does not, hide the button.

## 12. Build prompt for Claude

> Build S03.6 from `docs/02 - Admin/Claim Desk/desk_approve_submit_S03.6.md`. Load the task with `GET /api/v1/reviews/{task_id}` (task ID from the intake `pipeline`), decide with `POST /reviews/{task_id}/adjudicate` sending the loaded `version`, then submit with `POST /api/v1/claims/submissions` and poll `GET /claims/submissions/{id}`. Validate the reason with zod using `rationale_min_chars`. Handle `409`. Meet section 10, then run lint, tests and build.
