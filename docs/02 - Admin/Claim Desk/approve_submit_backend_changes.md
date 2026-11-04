# Approve & Submit (S03.6): Backend Changes Needed

> **Status:** Proposed · **Date:** 2026-11-04 · **Backend repo:** `sky_life_360_dev`
> **Frontend changes already done:** `ApproveSubmitStep.jsx`, `AdjudicationForm.jsx`, `IntegrityClearanceForm.jsx` (new),
> `PreApprovalChecklist.jsx`, `SubmissionTracker.jsx`, `useReviewTask.js`, `useSubmission.js`, `submissionsApi.js`,
> `useClaimDesk.js`, `review/utils/reviewLabels.js` (new).

The frontend now follows the backend contract as it is today. None of the items below block manual testing
(see section 3). Items 1–3 are security or correctness gaps; items 4–6 would make the UI simpler.

---

## 1. Permission checks that are defined but not enforced (security)

| Route | Today | Should be |
|---|---|---|
| `GET /api/v1/integrity/checks/{packet_id}` | `get_current_tenant` | `require_permission("integrity:view")` |
| `GET /api/v1/integrity/runs/{run_id}` | `get_current_tenant` | `require_permission("integrity:view")` |
| `GET /api/v1/integrity/files/{file_id}` | `get_current_tenant` | `require_permission("integrity:view")` |
| `POST /api/v1/integrity/check` | `get_current_tenant` | `require_permission("integrity:view")` (or a new `integrity:run`) |
| `POST /api/v1/claims/submissions` | `get_current_tenant` | `require_permission("claims:submit")` |
| `POST /api/v1/claims/submissions/{id}/requeue` | `require_tenant_level_key` | that **plus** `require_permission("claims:submit")` |

Files: `app/features/f005_integrity_check/router.py`, `app/features/f006_human_validation/submission/router.py`.

`claims:submit` is in `ROLE_DEFAULT_PERMISSIONS`, but no route checks it (`grep -rn "claims:submit" app` only finds
`auth/service.py`).

`GET /api/v1/reviews/{task_id}` also returns `integrity_checks[]` (check summaries). If doctors and staff must never
see integrity findings, either require `integrity:view` there or leave out `integrity_checks` when the caller doesn't
have that permission.

## 2. `MEMBER` role has `integrity:view` and `integrity:clear`

`app/features/auth/service.py`, `ROLE_DEFAULT_PERMISSIONS[ROLE_MEMBER]` includes `integrity:view`,
`integrity:clear` and `claims:approve`. The screen spec (`users_access_S04.md`) says doctors and hospital staff never
see integrity findings. If doctors and staff are `MEMBER` users, remove `integrity:view` and `integrity:clear` (and
probably `claims:approve`) from that role. **This is a product decision. Confirm with the product owner before
changing it.**

## 3. Logged-in users always run on global settings (`domain_id=None`)

`app/shared/deps.py`, `get_current_tenant` session branch: the `TenantContext` is built with `domain_id=None`, so
`resolve_tenant_domain` returns `None` for every session user. Domain overrides are therefore never applied to
browser users. That includes status labels, the integrity embedder, the effective config, and the submission
config and domain attributes. API-key callers do get them, so the same claim can behave differently through the
UI and through the API. Fix: resolve the user's domain (from the tenant or user record) when building the session
context.

## 4. Add the gap report to the intake `pipeline` view

`app/features/f004_claims_rulebook/intake/service.py` → `pipeline_view()` returns `packet`, `integrity`, `review` and
`submission`, but not the gap report a rejection creates. After a page reload the UI can't show "gap report sent"
or link to `GET /claims/gap-reports/{id}`; today it only knows this from the adjudicate response.
Add:

```python
view["gap_report"] = {"gap_report_id": report.id, "status": report.status}  # latest for this packet
```

## 5. Return the hand-off result from `GET /reviews/{task_id}`

With `review_auto_handoff=True`, the hand-off result (`submitted` / `gap_report` / `skipped` / `failed`, with ids
and error) only comes back in the `POST /adjudicate` response. It is recorded as an `AuditEvent`
(`review_handoff_*`) but isn't readable later. If the hand-off **failed**, a reviewer who reloads the page can't
see why. Add a `handoff` field (the latest `review_handoff_*` event detail) to `ReviewTaskDetail`.

## 6. Readable error message on submissions

`SubmissionSummaryOut` exposes `last_error_code` but no message. Add `last_error_message` (from the last attempt)
so `DEAD_LETTERED` and `PAYER_REJECTED` can show the reviewer what went wrong.

---

## Contract the frontend now relies on (please don't change without telling the frontend team)

- `POST /reviews { packet_id }` returns the existing task (200) or a new one (201), as a `ReviewTaskDetail`.
- `ReviewTaskDetail`: `task_id`, `version`, `stage` (`INTEGRITY_REVIEW` | `CODER_REVIEW`), `blockers[]`, `flags[]`,
  `integrity_checks[].false_positive_eligible`, `rationale_min_chars`, `integrity_flag`, `soft_gaps`, `decision`.
- Blocker and flag codes: `GAP_HARD_REJECTION`, `PACKET_FORMAT_INVALID`, `INTEGRITY_NOT_COMPLETED`,
  `INTEGRITY_HARD_FAIL:<CHECK_TYPE>`, `GAP_SOFT_GAPS`, `MEDGEMMA_GAPS`, `QUARANTINED_SECTIONS`, `UNMAPPED_CODES`
  (mapped to text in `src/features/review/utils/reviewLabels.js`).
- `POST /reviews/{id}/adjudicate` returns `handoff` = `{action, submission_id?, payer_code?, gap_report_id?,
  recipients?, reason?, error_code?, message?}`. The UI no longer calls `POST /claims/submissions` after an approval
  unless the hand-off failed or was skipped.
- `gap_report_recipients: []` means the packet's own user receives the report.
- Submission statuses: `QUEUED`, `DISPATCHING`, `RETRY_SCHEDULED` (polled) and `SUBMITTED`, `PAYER_REJECTED`,
  `DEAD_LETTERED` (final). Only `DEAD_LETTERED` can be requeued, with `{ reason }`.

---

## Manual testing notes

**Test user (created 2026-11-04, tenant `HOSP-001`):**

| Email | Password | Role |
|---|---|---|
| `integrity.admin@hosp.org` | `IntegrityTest123!` | `ADMIN` |

Admins always need MFA. In `APP_ENV=development` the 6-digit code is returned as `dev_otp` and printed in the
backend log.

**One person can't do the whole flow (`review_allow_self_approval=false`, the default):**

- The user who built the packet (ran Check gaps) **cannot approve it**: 403 `SELF_APPROVAL_NOT_ALLOWED`.
- The user who cleared the integrity flags **cannot approve it either**.

So a full test with `integrity.admin@hosp.org` needs a second admin (e.g. `admin@hosp.org`) to approve, and a third
if the integrity run was flagged and the second admin cleared it. For solo local testing only, set this in the
backend `.env` and restart:

```
REVIEW_ALLOW_SELF_APPROVAL=true
```

Never set this outside local development; it switches off the rule that a different person must approve.

**Scenarios to cover:**

1. Clean claim (integrity `PASS`): Approve, then the submission is queued automatically and the tracker polls to
   `SUBMITTED`.
2. Integrity `SOFT_WARN`: "Clear integrity flags first" shows and approve is disabled. Clear with a reason, then
   (as another admin) approve, or approve as a false alarm (only checks that ran fully can be marked false
   alarms).
3. Integrity `HARD_FAIL`, or a gap hard rejection: approve options are disabled and only "Send back" works. A gap
   report goes to the hospital user.
4. Stale version: open the same task in two tabs and decide in one. The other tab gets 409
   `CONCURRENT_MODIFICATION` and reloads the task.
5. Payer down: the submission goes `RETRY_SCHEDULED`, then `DEAD_LETTERED`. Enter a reason and click Requeue,
   and it goes back to `QUEUED`.
