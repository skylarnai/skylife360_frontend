# Check gaps (claim desk step 3) — integration plan

> **Status:** planning · **Branch:** `sashi_dev_frontend` · **Written:** 2026-11-03
> **Comes after:** Upload (`docs/ingestion_integration_plan.md`) and Read documents (done).
> **Ask step:** switched off for now. See §1.

---

## 1. Ask step is disabled

`POST /rag/ask` returns **502** because the backend has no answer model configured (no `LLM_*` settings in its `.env` and no `models/` folder). Search works, but Ask doesn't, so the step is hidden until the backend has a model.

| What | Where |
|---|---|
| Flag | `VITE_ENABLE_ASK=false` in `.env` / `.env.example` → `env.enableAsk` (`src/config/env.js`) |
| Steps shown | `DESK_STEPS` in `src/features/claim-desk/constants.js` drops `ask` when the flag is off. The steps renumber themselves: 1 Upload · 2 Read · 3 Check gaps · 4 Integrity · 5 Approve. |
| Next button | `ReadDocumentsStep` → "Next: check gaps →" goes to `/claims/:id/gaps` |
| Old links | `/claims/:id/ask` redirects to `/claims/:id/gaps` (`ClaimDeskLayout`) |
| Doctor tab | "Ask about a patient" is hidden from `CLINICAL_TABS` |
| Code kept | `AskStep.jsx`, `src/features/rag/**` are kept as they are, just not rendered, so no RAG API is called |

**To turn it back on:**
1. Configure the backend model, using one of:
   - `LLM_MODEL_PATH=medgemma-4b-it` plus the model in `sky_life_360_dev/models/`
   - `LLM_PROVIDER=openai_compatible`, `LLM_API_BASE_URL`, `LLM_MODEL_NAME`
2. Set `VITE_ENABLE_ASK=true` and restart Vite.

The Check gaps step does **not** need that model. With the default `EVAL_PROVIDER=placeholder`, the backend reads facts with rules only and skips the MedGemma sections. The packet is still built.

---

## 2. What the step does (one call does most of it)

`POST /api/v1/claims/intake` runs the whole chain **synchronously** and returns when the packet exists:

```
files (INGESTED + INDEXED)
  → document scan (tampering)            F005 file_scan
  → read claim facts from the text        rules (+ model when EVAL_PROVIDER is set)
  → patient identity check vs subscriber  MATCH | MISMATCH | NOT_FOUND
  → gap check against payer rules         T009  → gap_run_id
  → build claim packet                    T010  → packet_id
  → queue integrity run                   T011  → integrity_run_id   (step 4 polls this)
```

So the frontend does **not** call `/claims/gaps/evaluate` or `/claims/packets/assemble` itself. It calls intake once, then reads the results:

| # | Call | Purpose |
|---|---|---|
| 1 | `POST /claims/intake/extract` | *Optional preview, nothing is saved.* Pre-fills the form (dates, diagnosis, bill lines) and shows the scan flags. |
| 2 | `POST /claims/intake` | Runs the chain. Returns `intake_id`, `gap_run_id`, `packet_id`, `integrity_run_id`, `identity_check`. |
| 3 | `GET /claims/gaps/runs/{gap_run_id}` | Findings to show (hard / soft, description, remediation, page) |
| 4 | `GET /claims/packets/assemblies/{packet_id}` | Packet status, outcome, format, sections |
| 5 | `GET /claims/gaps/runs/{id}/report` · `GET /claims/packets/assemblies/{id}/download` | Download buttons (presigned URLs) |
| 6 | `GET /claims/intake/{intake_id}` | Reload after a refresh, and the `pipeline` block (packet / integrity / review / submission) |

---

## 3. Screen layout (`/claims/:id/gaps`)

```
┌ Check gaps against payer rules ───────────────── Payer SYN-07 · rules on 09 Oct ┐
│                                                                                 │
│ A. Claim details (form, prefilled from /intake/extract + claim)          GAP-02 │
│    Payer · Plan · Service date · Member ID · First/Last name · DOB · Sex       │
│    Provider ID · Provider name · Facility / price tier (billing, optional)     │
│    [x] Patient consented to processing   [ ] …to de-identified training use    │
│    Documents: 6 of 7 ready (ZIP itself is not sent)                     GAP-03 │
│                                                [ Run gap check ]               │
│                                                                                 │
│ B. Result banner: eligible / conditional / not eligible + identity check GAP-05 │
│ C. Findings list: HARD / SOFT chip · title · fix · source file + page    GAP-05 │
│ D. Claim packet card: status chip · format · parts · download buttons   GAP-06 │
│                                                [ Next: integrity check → ]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend tasks

| ID | Task | Files | Owner |
|---|---|---|---|
| **GAP-01** | **API layer.** `intakeApi`: add `Idempotency-Key` from a ref (same pattern as `useUploadBatch`), and keep `extractFacts`, `createIntake`, `getIntake`. `gapsApi.getRun` and `packetsApi.getAssembly` already exist. Map backend errors in `apiError.js` (see §6). | `src/features/gaps/api/*.js`, `src/services/api/apiError.js` | |
| **GAP-02** | **Claim details form.** Fields from §5.1. Prefill order: (1) claim record (mock until backend B-G1), (2) `/intake/extract` facts (`service_date`, `facts.subject_sex`…), (3) user input. Consent checkbox is required. | new `src/features/gaps/components/ClaimDetailsForm.jsx` | |
| **GAP-03** | **Pick the files.** From the batch (`useBatch(batchId)`), send only files that are `status === 'INGESTED'`, `extraction_status === 'INDEXED'` and **not** `is_archive`. A `DUPLICATE` sends its `duplicate_of_file_id` if that file is indexed. Max 20. Show "N of M documents ready" and block the button if 0. | new `src/features/gaps/utils/intakeFiles.js` | |
| **GAP-04** | **Run intake.** `useRunIntake` mutation: on success save `intakeId`, `gapRunId`, `packetId`, `integrityRunId` to the desk, `gapsRun: true`, and put `?intake=` in the URL (same idea as `?batch=`). **Remove** the silent `catch` that shows `PROTOTYPE_GAPS`. On failure show `ErrorBox` with the mapped message and keep the form. | new `src/features/gaps/hooks/useRunIntake.js`, `CheckGapsStep.jsx` | |
| **GAP-05** | **Findings view.** `useGapRun(gapRunId)` (refetch every 2 s while status is `PENDING`/`EVALUATING`/`REPORT_GENERATING`). Banner from `outcome`, counts from `hard_rejections`/`soft_gaps`/`rules_passed`. Each finding: chip from `gap_type`+`action`, `description`, `remediation`, source `page_number` (file name needs backend B-G5). Identity banner from `identity_check.status` (MISMATCH = red). | new `useGapRun.js`, `GapFindingList.jsx`, `constants/statusMaps.js` | |
| **GAP-06** | **Packet card.** `usePacket(packetId)`. Status chip from `assembly_outcome`. `has_unmapped_codes` / `quarantined_sections` show a note. Download packet (one link per part when `is_split`) and gap report (only when `report_available`). Replace hardcoded `PACKET_JSON`. | new `usePacket.js`, `PacketCard.jsx` | |
| **GAP-07** | **Reload + desk status.** On load: `?intake=` → `GET /claims/intake/{id}` → its ids. `gapsLeft` in `useClaimDesk` = `soft_gaps + hard_rejections` from the run (not the prototype constant). Header pill uses it. | `useClaimDesk.js`, `deskStatus.js` | |
| **GAP-08** | **Hand-off to Integrity.** Intake has **already queued** the integrity run. Step 4 should poll `GET /integrity/runs/{integrityRunId}` and **not** call `POST /integrity/check` again. Pass `?intake=` along on "Next". | `IntegrityStep.jsx` (next plan) | |
| **GAP-09** | **API rail + clean-up.** Update `DESK_STEP_APIS.gaps` to list intake + reads. Delete `PROTOTYPE_GAPS` and the hardcoded `payer_id: 'SYN-07'` / `service_date: '2026-10-09'` once GAP-04/05 land. | `claim-desk/constants.js` | |

**Suggested order:** GAP-01 → GAP-03 → GAP-02 → GAP-04 → GAP-05 → GAP-06 → GAP-07 → GAP-09, then GAP-08 with the Integrity step.

---

## 5. Contracts (as the backend has them today)

### 5.1 `POST /api/v1/claims/intake` — 201 (same key + same body again: 200)

Header: `Idempotency-Key: <uuid>` (reuse on retry, new key after the user changes anything).
Permission: `claims:intake`. The patient (`user_id`) must be granted to the tenant (`grant-user`).

```json
{
  "file_ids": ["f-…", "f-…"],                // required, 1–20, INGESTED + INDEXED, not the ZIP
  "user_id": "SYN-P-1042",                   // patient
  "encounter_id": "SUV-261028-01",           // required (use claim id until there is an encounter id)
  "claim_id": "SUV-261028-01",
  "payer_id": "SYN-07",                      // required
  "payer_name": "Insurer SYN-07",
  "plan_id": null, "region": null,
  "service_date": "2026-10-09",              // optional; else the admission date from the documents
  "target_format": "JSON",                   // JSON | X12_278 | PMJAY_TMS (optional)
  "billing": { "facility_id": "…", "price_tier": "general_ward" },   // optional, enables tariff checks
  "subscriber": { "member_id": "POL-SYN-77120", "first_name": "…", "last_name": "…",
                  "birth_date": "1980-04-02", "gender": "F" },        // required (gender M|F|U)
  "provider":   { "provider_id": "HOSP-0042", "name": "…", "id_qualifier": "PI" },  // required
  "consent":    { "processing": true, "training": false, "reference": "CONSENT-001" }, // required
  "facts": null,                             // optional corrections (ClaimFacts) that override extraction
  "clinical_summary": null
}
```

Response `ClaimIntakeOut`:

```json
{
  "intake_id": "…", "status": "HANDED_OFF", "status_label": "Handed off",
  "failed_step": null, "error_code": null, "encounter_id": "SUV-261028-01",
  "identity_check": { "status": "MATCH", "checks": { "name": { "status": "MATCH", "score": 96 } } },
  "consent": { "processing": true, "training": false, "reference": "…" },
  "gap_run_id": "…", "packet_id": "…", "integrity_run_id": "…",
  "pipeline": { "packet": {…}, "integrity": {…}, "review": null, "submission": null },
  "created_at": "…", "completed_at": "…"
}
```

### 5.2 `POST /api/v1/claims/intake/extract` — 200 (preview, nothing saved)

Body: `{ file_ids, user_id, service_date?, billing? }`.
Returns `service_date`, `facts`, `fact_sources`, `citations[]`, `bill_lines[]`, `document_types{}`, `unverified_codes[]`, `missing_facts[]`, `file_scans{}`.

### 5.3 `GET /api/v1/claims/gaps/runs/{run_id}`

`status`, `outcome` (`eligible` | `conditional` | `not_eligible`), `total_gaps`, `hard_rejections`, `soft_gaps`, `rules_evaluated`, `rules_passed`, `rules_not_applicable`, `rules_errored`, `report_available`, `findings[]`:
`finding_id, source (rule|registry|tariff), rule_key, action (reject|require_preauth|query|flag_review), gap_type (hard|soft), reason_code, description, remediation, trace_status (linked|unavailable|not_cited), chunk_id, page_number`.

### 5.4 `GET /api/v1/claims/packets/assemblies/{assembly_id}` (= `packet_id`)

`status`, `status_label`, `assembly_outcome` (`SUBMISSION_READY` | `QUARANTINED` | `REJECTED_GAPS`), `target_format`, `is_split`, `split_count`, `has_unmapped_codes`, `quarantined_sections`, `hard_rejections`, `soft_gaps`, `sections[]`, `payload_parts[]`, `download_url`.
Download: `GET …/assemblies/{id}/download` → `{ url, part_number, total_parts, content_format, expires_in_seconds }`.
Gap report: `GET /claims/gaps/runs/{id}/report` → `{ url, expires_in_seconds }`.

### 5.5 Status → UI

| Backend value | Chip / banner | Tone |
|---|---|---|
| outcome `eligible` | Nothing blocks this claim | ok |
| outcome `conditional` | N to fix before submitting | amb |
| outcome `not_eligible` | Payer will reject this claim | red |
| finding `gap_type: hard` | MUST FIX | red |
| finding `gap_type: soft` | SHOULD FIX | amb |
| finding `action: require_preauth` | NEEDS PRE-AUTH | plum |
| packet `SUBMISSION_READY` | READY | ok |
| packet `QUARANTINED` | NEEDS REVIEW | amb |
| packet `REJECTED_GAPS` | BLOCKED | red |
| identity `MATCH` / `MISMATCH` / `NOT_FOUND` | Patient matches / Name or DOB doesn't match / Patient not found in documents | ok / red / grey |
| intake `FAILED` | Failed at {failed_step} | red |

---

## 6. Errors to map (GAP-01)

| HTTP | `error_code` | Message on screen |
|---|---|---|
| 422 | *(FastAPI validation: `detail` is an **array**, not `{error_code}`)* | "Some claim details are missing: {fields}". Read `detail[].loc`. |
| 422 | `CONSENT_REQUIRED` | "Confirm the patient's consent to process this claim." |
| 422 | `INTAKE_FACTS_INCOMPLETE` | "No admission date found in the documents. Enter the service date." (focus that field) |
| 422 | `INTAKE_FILES_NOT_READY` (max files) | "Up to 20 documents per gap check." |
| 409 | `INTAKE_FILES_NOT_READY` | "Some documents are still being read. Try again in a moment." |
| 409 | `IDEMPOTENCY_KEY_REUSED` | "This check is already running. Wait, then refresh." |
| 404 | `NOT_FOUND` | "A document for this claim could not be found." |
| 403 | `UNAUTHORIZED_USER` | "You don't have access to this patient's records." |
| 5xx | any (`failed_step` set on the intake) | "The gap check failed at {step}. Try again." |

> `apiError.js` currently assumes `detail` is an object. Handle the array case for 422 validation errors. This is what produced the 422 you saw: the old call sent no `file_ids`, `subscriber`, `provider` or `consent`.

---

## 7. Backend API requirements

Items already requested in `docs/ingestion_backend_api_requests.md` (A1 `GET /claims/{id}`, A4 `GET /claims/{id}/documents`, …) still apply. These are new for this step:

| # | Need | Proposed API | Why / where in the frontend | Priority |
|---|---|---|---|---|
| **B-G1** | Claim record carries the intake inputs | Extend A1 `GET /claims/{claim_id}` with `payer_id`, `payer_name`, `plan_id`, `region`, `subscriber{member_id, first_name, last_name, birth_date, gender}`, `encounter_id`, `service_date` | GAP-02 prefill. Today there's no claim API, so these come from mock data or the user types them. | **P1** |
| **B-G2** | Hospital / provider profile | `GET /api/v1/tenant/profile` → `{ provider_id, provider_name, id_qualifier, facilities: [{facility_id, name, price_tiers[]}] }` | GAP-02 provider fields + billing dropdowns. Also the header hospital name (currently falls back to tenant id). | **P1** |
| **B-G3** | Payer list | `GET /api/v1/payers` → `[{ payer_id, name, plans[], regions[], target_format }]` (or derived from `/rules/active`) | GAP-02 payer dropdown. Without it the user types a payer id and a typo gives zero rules → false "eligible". | **P1** |
| **B-G4** | Find the latest intake of a claim | `GET /api/v1/claims/intake?claim_id=&limit=1` (or `GET /claims/{id}/intake`) | GAP-07 reload without `?intake=` in the URL; worklist stage. | **P1** |
| **B-G5** | File on each finding | Add `file_id`, `original_filename` to `GapFindingResponse` (from `chunk_id`) | GAP-05 "source: operation_note.pdf · page 2". Today only `chunk_id` + `page_number`. | **P2** |
| **B-G6** | A short title per finding | Add `title` (rule name) to `GapFindingResponse` | GAP-05 bold line; `description` is long. | **P2** |
| **B-G7** | Skip archive parents in intake | Intake ignores `is_archive` file ids (or returns which ids it skipped) instead of 409 | GAP-03 simplification; frontend filters for now. | **P3** |
| **B-G8** | Async intake | `POST /claims/intake` → 202 + `intake_id` while `PROCESSING`; frontend polls `GET /claims/intake/{id}` | Becomes needed when `EVAL_PROVIDER` is real and the call takes minutes (timeouts, no progress). Fine synchronously while on placeholder. | **P2** |
| **B-G9** | Resolve / re-check a finding | `POST /api/v1/claims/gaps/findings/{finding_id}/resolve { note }` and re-run intake with new files | "N to fix" counter going down; soft gaps like "policy schedule not uploaded". Until then: upload more → run the check again. | **P2** |
| **B-G10** | Standard 422 shape | Return validation errors as `{detail:{error_code:"VALIDATION_ERROR", message, fields:[…]}}` | Same error parsing everywhere (§6). | **P3** |

**Backend setup needed to test (no code change):**
- Payer rules loaded for the payer you test with (`POST /api/v1/rules` or `/rules/import`). With no rules the run is `eligible` with `rules_evaluated: 0`.
- Optional: an active charge master for `billing` (`/api/v1/charges/masters/{id}/activate`) to get tariff checks.
- Patient granted: `python -m app.manage grant-user --tenant-id HOSP-001 --user-id SYN-P-1042`.

---

## 8. How to test

1. Upload `01_main_test` (see `sky_life_360_test_files/README.md`) and wait until Read documents shows them as read.
2. Next → Check gaps. The form shows "6 of 7 documents ready" (the ZIP isn't sent).
3. Untick consent → button disabled. Tick it, fill subscriber/provider, Run.
4. Expect 201, findings list, packet card. Refresh → same results via `?intake=`.
5. Run again without changes → 200 with the same ids (idempotent).
6. Enter a different first name → identity `MISMATCH` banner.
7. Stop the backend → error box, form kept, "Try again" works.

## 9. Done when

- No `PROTOTYPE_GAPS`, `PACKET_JSON`, hardcoded payer or service date left in `CheckGapsStep`.
- Every failure shows a real message. Nothing marks `gapsRun` unless intake returned 201/200.
- Refresh keeps the results. Integrity step uses `integrityRunId` from intake.
- `npm run lint` and `npm run build` pass.
