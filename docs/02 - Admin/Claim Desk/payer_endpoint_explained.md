# Payer endpoint: what "Submit" really sends, and where

| Field | Value |
|---|---|
| Screen | S03.6 Approve & submit (submission tracker) |
| Backend | `app/features/f006_human_validation/submission/` (`payer_client.py`, `document.py`, `classify.py`, `cli.py`) |
| Checked against | backend `dev` @ `0c09a8f`, local database `HOSP-001` (6 Nov 2026) |
| Short answer | **There is no real payer connected.** For testing we point the payer endpoint at `httpbin.org`, a public echo service. "SUBMITTED" only means *httpbin answered 200*, not that an insurer received the claim. |

---

## 1. Today in your local setup

| Item | Value |
|---|---|
| Payer endpoints registered for `HOSP-001` | **None** (`list-payers` prints nothing) |
| What happens if you approve now | The auto hand-off fails with **`PAYER_NOT_CONFIGURED`**. Step 6 shows the error and a **Submit to …** button. |
| What the test guides register | `payer-01` → `https://httpbin.org/post`, no auth |
| Real insurer / TPA endpoint | **Not available yet.** No URL, contract or credentials from any payer. |

## 2. How a payer endpoint is chosen

```
S03.4 Check gaps form            backend                                  payer_endpoints table
──────────────────────            ───────                                  ─────────────────────
Payer ID: payer-01   ─────────►  packet.payer_id = "payer-01"  ─────────►  payer_code = "payer-01"  (active)
                                                                            base_url + submit_path
                                                                            auth_scheme, auth_secret_ref
```

The **Payer ID typed at Check gaps** must equal the **payer code** of an active endpoint registered for the tenant. No match → `PAYER_NOT_CONFIGURED`.

## 3. What is sent

One HTTPS `POST {base_url}{submit_path}` per attempt, body = JSON (exact bytes are stored and hashed, so we can prove what was sent):

```json
{
  "external_reference": "<submission_id>",
  "packet": { "...the claim packet built at Check gaps: subscriber, provider, diagnoses, procedures, bill lines..." },
  "approval": { "decision_id": "…", "approved_at": "2026-11-06T10:15:00+00:00", "reviewer_user_id": "…" },
  "supporting_documents": [
    { "file_id": "…", "document_type": "discharge_summary", "sha256": "…", "size_bytes": 1666 }
  ]
}
```

| Header | Value |
|---|---|
| `Idempotency-Key` | the submission ID (a resend never creates a second claim at a payer that supports it) |
| `Authorization` | `Bearer <token>` when `auth_scheme = bearer`; the token is read from the env variable named by `--auth-secret-ref`, never stored in the database |
| *custom header* | when `auth_scheme = api_key_header` (`--auth-header-name`) |

**Only document fingerprints are sent** (`file_id`, type, `sha256`, size), not the PDFs themselves.

## 4. How the answer is read

| Payer answers | Outcome | Tracker shows |
|---|---|---|
| `200`, `201`, `202`, other `2xx` | Accepted | **Received by payer** → `SUBMITTED` |
| `409` | Already has this claim (same reference) | `SUBMITTED` |
| `429`, `503`, `5xx`, `408`, timeout | Temporary, retried with back-off (up to 10 attempts, max 15 min apart) | **Sending** / **Retrying** |
| `401`, `403` | Retried (usually rotated credentials), then dead-lettered | **Sending failed after every attempt** → **Requeue** |
| Other `4xx` (e.g. `400`, `422`) | Permanent | **PAYER REJECTED** + message |

The response body is never logged. Only `status`, `received_at`, `message_id`, `ack_id` and the reference field (`claim_reference` by default) are kept.

## 5. Why httpbin, and what it does *not* prove

`https://httpbin.org/post` returns `200` and echoes whatever it receives. So with it:

| Proves | Does not prove |
|---|---|
| Approve → auto hand-off → queue → dispatcher → HTTP call → `SUBMITTED` works end to end | That any insurer accepts our format (their schema, codes, mandatory fields) |
| The tracker, polling, `pipeline_stage = SUBMITTED` and the worklist badge | Real acknowledgement / claim numbers (httpbin has no `claim_reference`) |
| | Rejections, rate limits, auth failures (httpbin never sends them) |

> **Data warning:** httpbin is a public third-party service. The packet contains patient name, member ID, birth date and diagnoses. **Use synthetic patients only** (the `SYN-…` test data). Never submit a real claim while httpbin is registered.

Local HTTP mocks (`http://localhost:…`) can't be used: the backend refuses `http://`, `localhost`, private IPs and `.internal` hosts (SSRF guard).

## 6. Commands

```powershell
cd D:\projects\sky_life_360_dev; .venv\Scripts\Activate.ps1

# Test endpoint (synthetic data only)
python -m app.features.f006_human_validation.submission.cli add-payer --tenant-id HOSP-001 `
  --payer-code payer-01 --name "National Health Payer (TEST - httpbin)" `
  --base-url https://httpbin.org --submit-path /post --auth-scheme none

# See what is registered
python -m app.features.f006_human_validation.submission.cli list-payers --tenant-id HOSP-001

# Turn the test endpoint off (re-run add-payer with the same code + --inactive)
python -m app.features.f006_human_validation.submission.cli add-payer --tenant-id HOSP-001 `
  --payer-code payer-01 --name "National Health Payer (TEST - httpbin)" `
  --base-url https://httpbin.org --submit-path /post --auth-scheme none --inactive
```

## 7. What we need from a real payer / TPA

| Need | Used for |
|---|---|
| HTTPS base URL + submit path (and an inquiry path if they have one) | `--base-url`, `--submit-path`, `--inquiry-path` |
| Auth method + credentials (bearer token or API key header) | `--auth-scheme`, `--auth-header-name`; token goes in the backend `.env` under the name passed as `--auth-secret-ref` (e.g. `PAYER_TPA01_TOKEN`) |
| Their claim JSON schema | Today we send our own envelope (§3). A real payer will need a **mapping layer** from our packet to their format (not built). |
| Response format: where the claim number is | `--reference-field` |
| Idempotency support, rate limit, max payload size | `--supports-idempotency`, `--rate-limit-per-minute`, `--max-payload-bytes` |
| Sandbox / UAT environment | Testing before production |
| Whether they want the PDFs themselves | Today only fingerprints are sent; `POST /claims/submissions/{id}/document-link` can create a signed download link if needed |

## 8. Frontend notes

- The tracker label "Received by payer" should read **"Received by test payer (httpbin)"** while a test endpoint is registered, or show a **TEST PAYER** chip next to the payer name. Proposal: the backend adds `is_test` to the payer endpoint and to `SubmissionSummaryOut`.
- The **Submit to …** button text comes from the endpoint `name`. Including "(TEST - httpbin)" in the name (§6) makes it obvious on screen today, with no code change.
