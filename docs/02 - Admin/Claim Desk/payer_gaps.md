# Payer: gaps to close before "Submit" is real

| Field | Value |
|---|---|
| For | Backend team and product (town hall follow-up) |
| Screens | S03.4 Check gaps (Payer ID) · S03.6 Approve & submit (hand-off, submission tracker) |
| Backend checked | `D:\projects\sky_life_360_dev` @ `203f135` (8 Nov 2026), tenant `HOSP-001` |
| How it works today | [payer_endpoint_explained.md](payer_endpoint_explained.md) |
| For leadership | [payer_decision_brief.md](payer_decision_brief.md): proposal to keep submission as a placeholder |
| Bug ticket | [payer_handoff_bug_B1.md](payer_handoff_bug_B1.md) |
| Short answer | **No payer is connected.** `list-payers` for `HOSP-001` prints nothing, so every approval ends with `PAYER_NOT_CONFIGURED`. A payer can only be added from the command line, the Payer ID is free text, and nothing comes back from a payer after it says "received". |

---

## 1. What happens today

```
Step 4 Check gaps: admin types "Payer ID" (free text, e.g. payer-01)
        │
Step 6 Approve ──► hand-off looks for an ACTIVE payer endpoint whose payer_code == Payer ID
        │
        ├─ none found ──► handoff failed · PAYER_NOT_CONFIGURED   ◄── today, always
        │                 (step 6 shows the error + "Submit to …" button)
        │
        └─ found ──► submission queued ──► dispatcher (inside the backend) POSTs the packet
                       to https://<base_url><submit_path>
                       2xx ► SUBMITTED · 409 ► SUBMITTED (duplicate) · 429/5xx/401/403 ► retry
                       other 4xx ► PAYER_REJECTED · retries used up ► SUBMISSION_FAILED (requeue)
```

Seen live on 8 Nov 2026: claim `SUV-261112-01` re-checked after the send-back loop. Its Payer ID is `payer-01`, and no `payer-01` endpoint exists.

## 2. Bug found while testing (fix before the demo)

### B1 · Approving without a payer returns 500 instead of `failed · PAYER_NOT_CONFIGURED`

Full ticket: [payer_handoff_bug_B1.md](payer_handoff_bug_B1.md).

| Item | Detail |
|---|---|
| Seen | 8 Nov 2026, claim `SUV-261112-01`, `POST /reviews/{id}/adjudicate` (APPROVED) by `integrity.admin@hosp.org` → **500 Internal Server Error** |
| What was saved | The decision **is** saved (task `ADJUDICATED`, worklist `APPROVED`), but **no hand-off is recorded** (`handoff: null`, no `review_handoff_*` audit event, no submission) |
| Expected | `200` with `handoff: { action: "failed", error_code: "PAYER_NOT_CONFIGURED", … }`, as the docstring says ("never raises") |
| Cause | `app/features/f006_human_validation/handoff.py` `after_decision`: on `ServiceError` it calls `await db.rollback()`, which **expires every loaded object**, then builds the `AuditEvent` from `task.tenant_id`, `task.id`, `task.packet_id`. Reading an expired attribute on an async session needs a lazy load → `MissingGreenlet` → 500. The same happens on any hand-off failure (`ClaimInputsUnavailable`, unexpected exceptions). |
| Fix | Read the ids **before** the `try`, and use only those afterwards: `task_id, tenant_id, packet_id = task.id, task.tenant_id, task.packet_id` (in the `AuditEvent` and the log lines). Add a test: approve with no payer endpoint → 200, `handoff.action == "failed"`, `error_code == "PAYER_NOT_CONFIGURED"`, audit event written. |
| Frontend today | Shows the 500 error, then reloads the review: the claim is APPROVED with no hand-off, so step 6 shows **Submit to …** (which answers `422 PAYER_NOT_CONFIGURED` until a payer exists). Nothing is lost. |
| Demo impact | **High.** Approving on stage without a payer shows "Internal Server Error". Register the test payer (section 4) or get B1 fixed first. |

## 3. Gaps

| # | Gap | Impact | Who | Proposal |
|---|---|---|---|---|
| **P1** | **No payer registered** in `HOSP-001` | Approve never reaches SUBMITTED; today it even ends in a 500 (B1) | Setup (whoever runs the demo) | For the demo, register a **test** endpoint (section 4). For production, see P6. |
| **P2** | **Payers can only be managed from the CLI** (`submission.cli add-payer` / `list-payers`) | An admin can't add, fix or turn off a payer in the app. Needs server access. | Backend + frontend | `GET /api/v1/payers`, `POST /api/v1/payers`, `PATCH /api/v1/payers/{code}` (`payers:manage`, or `rules:manage`). Same validation as the CLI (https, public host, secret **name** not value). Frontend: a Payers screen under admin. |
| **P3** | **Payer ID is free text** at step 4 | A typo (`payer-1` vs `payer-01`) is only found **after approval**, as `PAYER_NOT_CONFIGURED` | Backend + frontend | `GET /api/v1/payers?active=true` → `[{ payer_code, display_name }]` for a dropdown at step 4. The backend should also warn at intake (`POST /claims/intake`) when no active payer has that code. |
| **P4** | **The claim has no payer code** (`claims.payer_id` is null; only `payer_name` is stored) | The worklist and step 4 can't prefill the payer; each re-check retypes it | Backend | Store `payer_code` on the claim when it's created, or from the first intake, and prefill step 4 from it |
| **P5** | **Local test needs a public https service** (the SSRF guard blocks `localhost`, private IPs, `.internal`) | Testing uses `httpbin.org`, which sends the (synthetic) packet to a third party. It can't be used with real data or offline. | Backend | A built-in **mock payer** for development only, e.g. `APP_ENV=development` + `PAYER_MOCK=true` serves `POST /api/v1/dev/mock-payer/claims` → `201 { claim_reference }`, with an option to answer 4xx / 5xx to demo rejection and retry. Keep the SSRF guard for everything else. |
| **P6** | **No real payer / TPA contract** | "SUBMITTED" only means the endpoint answered 2xx | Product / business | From each payer: URL, auth (token or API key), request format, acknowledgement format (which field is their reference), test environment. Is the target an NHCX / FHIR claim bundle or a TPA-specific JSON? The packet format may need an adapter per payer. |
| **P7** | **Nothing comes back after SUBMITTED** | No settlement, approved amount, payer query or denial reason reaches the system. Insurer questions (`PAYER_QUERY` to-dos) are created by hand only. | Backend | An inbound route per payer (webhook or polling) that maps payer events to: claim status (approved / partially approved / denied, with amount and reason) and `PAYER_QUERY` tasks for the doctor (`POST /tasks` already exists). `inquiry_path` today is only used to settle an ambiguous send. |
| **P8** | **Payer credentials live in backend environment variables** (`auth_secret_ref`) | A new payer or a rotated token needs a backend restart and server access | Backend | Read secrets from the secret store at call time. Show in the Payers screen whether the secret is **present** (never its value). |
| **P9** | **No payer health or history view** | When submissions fail, nobody sees "payer X is down" until each claim dead-letters | Backend + frontend | `GET /claims/submissions?payer=` exists. Add per-payer counts (queued, failed, last error, last success) to the Payers screen. |

## 4. Demo workaround (synthetic data only)

To show SUBMITTED at the town hall, register `payer-01` (the Payer ID the test claims use) against the public echo service `httpbin.org`. The packet holds **synthetic** test data only; never do this with real patient data.

```powershell
cd D:\projects\sky_life_360_dev
.\.venv\Scripts\python.exe -m app.features.f006_human_validation.submission.cli add-payer --tenant-id HOSP-001 `
  --payer-code payer-01 --name "National Health Payer (TEST: httpbin)" `
  --base-url https://httpbin.org --submit-path /post --auth-scheme none
.\.venv\Scripts\python.exe -m app.features.f006_human_validation.submission.cli list-payers --tenant-id HOSP-001
```

Then, on a claim that was approved without a payer, click **Submit to …** on step 6 (needs `claims:submit`). New approvals hand off automatically. The tracker goes Queued → Sending → **Received by payer** within a few seconds (the dispatcher runs inside the backend).

Turn it off after the demo:

```powershell
.\.venv\Scripts\python.exe -m app.features.f006_human_validation.submission.cli add-payer --tenant-id HOSP-001 `
  --payer-code payer-01 --name "National Health Payer (TEST: httpbin)" `
  --base-url https://httpbin.org --submit-path /post --auth-scheme none --inactive
```

What to say on stage: *"Submission is wired end to end. Today it goes to a test endpoint; connecting a real insurer is configuration plus their contract (P6), not new screens."*

## 5. Suggested order

1. **B1** hand-off 500 (small backend fix) and **P1** demo workaround (no code).
2. **P3** payer dropdown at step 4 and **P4** payer code on the claim: removes the most likely demo-day mistake.
3. **P5** mock payer for development: removes the httpbin dependency.
4. **P2** and **P8** payer admin API and screen.
5. **P6** and **P7** with the first real payer.
