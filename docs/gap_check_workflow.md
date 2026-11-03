# Check gaps — how it works and how to test it

> **Step:** claim desk step 3 (`/claims/:id/gaps`) · **Written:** 2026-11-03
> **Test pack:** `D:\projects\sky_life_360_test_files\04_gap_check\`
> **Verified:** all 4 scenarios + a billing run through the backend's real API in its test harness (in-memory DB, fake S3). See §9.
> **Not yet verified:** the same run on your local server from the UI. That needs the reference data loaded first (§3).

---

## 1. Why your gap check failed

Two problems were in the way. The first is fixed. The second needs one command on your side.

| # | Symptom | Cause | Status |
|---|---|---|---|
| 1 | `POST /claims/intake` → **500** `value too long for type character varying(36)` | Session client id `user:<uuid>` (41 chars) didn't fit `String(36)` columns | **Fixed** in backend (migration `r8s9t0u1v2w3`, see `docs/backend_fix_client_id_length.md`) |
| 2 | Intake saved but `status: FAILED`, `failed_step: assemble`, `error_code: NO_RULES_IN_FORCE` (your claim `CLM-261103-059447`) | The local DB has **no reference data**: 0 payer rules, 0 disease registry, 0 billing code sets, 0 tariffs (checked 2026-11-03) | **Load it once**, see §3 |

Without rules, the gap engine has nothing to check against, so it refuses the claim (HTTP 422 `NO_RULES_IN_FORCE`).

---

## 2. What one gap check does

The **Run gap check** button sends one request: `POST /api/v1/claims/intake`. The backend runs the whole chain in that request:

```
claim documents (INGESTED + text INDEXED, max 20, ZIP itself excluded)
 │
 ├─ 1. Document scan (F005)        PDFs/images checked for tampering → file_scans
 ├─ 2. Read claim facts            rule-based reader (no AI model needed), line by line:
 │                                 "Patient Name:", "Age:", "Sex:", "Date of Admission:",
 │                                 "Final Diagnosis: … ICD-10 I21.9", "Procedure: … code PCI001",
 │                                 bill lines "<charge code> <description> <amount>", "Grand Total:"
 │                                 document types from headings OR file names
 ├─ 3. Identity check              names/age/sex in documents vs. the subscriber you typed
 │                                 → MATCH | MISMATCH | NOT_FOUND
 ├─ 4. Gap check (T009)            facts vs. active payer rules + disease registry (+ tariff
 │                                 if billing is sent) → gap_run_id, outcome, findings
 ├─ 5. Claim packet (T010)         → packet_id, assembly_outcome
 └─ 6. Hand-off                    integrity run queued (T011) → integrity_run_id
                                   then a review task opens (T012) for step 5
```

The response comes back when step 5 is done. The frontend then reads:

| Call | Shown as |
|---|---|
| `GET /claims/gaps/runs/{gap_run_id}` | Outcome pill, counts, findings list |
| `GET /claims/packets/assemblies/{packet_id}` | Packet card (status, format, download) |
| `GET /claims/intake/{intake_id}` | Reload after refresh (`?intake=`), identity banner |
| `GET /claims/gaps/runs/{id}/report`, `…/assemblies/{id}/download` | Download buttons |

**Outcome rules:**

| `outcome` | Meaning | Screen |
|---|---|---|
| `eligible` | No findings | green "Nothing blocks this claim" |
| `conditional` | Soft gaps only (fixable) | amber "N to fix before submitting" |
| `not_eligible` | At least one hard rejection | red "N blocking issues · Payer will reject this claim" |

A hard rejection makes the packet `REJECTED_GAPS`, skips the integrity run, and opens a review task with recommendation `REJECT`.

---

## 3. One-time setup on your local backend

### 3.1 Backend fix (done)

```powershell
cd D:\projects\sky_life_360_dev
.venv\Scripts\python.exe -m alembic current   # must show r8s9t0u1v2w3 (head)
```

### 3.2 Load the reference data

What the gap check needs, all in `04_gap_check\reference_data\`:

| File | What it is | Loaded through | Used for |
|---|---|---|---|
| `rules.json` | 3 payer rules: **adults-only** (reject if age < 18), **cosmetic-exclusion** (reject COS001), **pci-needs-angiogram** (query if PCI001 without an angiogram report). They apply to every payer and are effective from 2026-04-01. | `POST /api/v1/rules` → validate → approve → activate | Rule findings |
| `disease_registry.xlsx` | Disease and treatment registry (I21.9 heart attack, stroke, pneumonia…) with the pre-auth diagnostics each specialty requires | `POST /api/v1/claims/registry/ingest` → activate | Diagnosis checks and pre-auth diagnostics |
| `code_set_TESTCPT.csv` | 20 billing codes (R1001 ultrasound…) | `POST /api/v1/charges/code-sets` | Recognising bill lines |
| `tariff_hyd-punjagutta.csv` | Hospital tariff for facility `hyd-punjagutta`: G-PCI001 PTCA package ₹1,50,000 and G-USG001 ultrasound ₹1,500 | `POST /api/v1/charges/masters` (auto-activate) | Tariff checks (only when `billing` is sent) |

Run the loader. It signs in as **you** (ADMIN / SUPER_ADMIN of HOSP-001). In development the backend returns the MFA code and the loader uses it automatically.

```powershell
cd D:\projects\sky_life_360_test_files\04_gap_check
D:\projects\sky_life_360_dev\.venv\Scripts\python.exe load_reference_data.py
```

Expected output:

```
Signed in as superadmin@hosp.org (SUPER_ADMIN)
1. Payer rules
  [ok]   adults-only -> ACTIVE
  [ok]   cosmetic-exclusion -> ACTIVE
  [ok]   pci-needs-angiogram -> ACTIVE
2. Disease registry
  [ok]   registry activated
3. Billing code set (TESTCPT)
  [ok]   20 codes loaded
4. Hospital tariff (hyd-punjagutta)
  [ok]   tariff ACTIVE
```

It's safe to run twice: anything already there is reported as `[skip]`. The loader's requests and response shapes were checked against the backend code, and the same API calls run in the harness test (§9). The script itself has not been run against your server yet.

---

## 4. The test pack (`04_gap_check\`)

Each folder is one claim for one patient: labelled PDFs with a real text layer (no OCR needed), plus `claim.json` with what to type into the forms and the expected result.

| Folder | Patient | Files | What it tests |
|---|---|---|---|
| `A_complete_claim` | SYN-GC-101 · Asha Verma · 54 F | discharge summary, angiogram report, final bill | The complete happy path |
| `B_missing_angiogram` | SYN-GC-102 · Rakesh Nair · 61 M | discharge summary, final bill (**no angiogram**) | A rule soft gap (query) |
| `C_minor_rejected` | SYN-GC-103 · Riya Shah · **10** F | all 3 | A hard rejection (adults-only) |
| `D_name_mismatch` | SYN-GC-104 · documents say **Ravi Kumar**, you type **Meera Iyer** | all 3 | Identity check MISMATCH |

Regenerate the pack with: `D:\projects\sky_life_360_dev\.venv\Scripts\python.exe make_gap_check_files.py` (in `sky_life_360_test_files`). This keeps `load_reference_data.py`.

---

## 5. Results (from the verified run)

Request body = exactly what the Check gaps form sends (no `billing`). Values are real responses.

| Scenario | Facts read from the PDFs | Identity | Outcome | Findings | Packet | Integrity | Review |
|---|---|---|---|---|---|---|---|
| **A** complete | I21.9 · PCI001 · 54 · female · emergency · 3-day stay · ₹1,51,500 · docs: angiogram_report, discharge_summary, final_bill | MATCH (name 100) | `conditional` 0 hard / 1 soft | registry: *Echo, Troponin I/T not documented* | `SUBMISSION_READY` | PASS | PENDING |
| **B** no angiogram | same, docs: discharge_summary, final_bill | MATCH | `conditional` 0 / **2** | rule **pci-needs-angiogram**: *An angiogram report is required for PCI.* + registry gap | `SUBMISSION_READY` | SOFT_WARN | PENDING |
| **C** age 10 | age **10** | MATCH | `not_eligible` **1** / 1 | rule **adults-only** (reject, POLICY_VIOLATION): *The subject must be an adult.* + registry gap | `REJECTED_GAPS` | — (skipped) | PENDING, recommends **REJECT** |
| **D** wrong name | name in docs ≠ subscriber | **MISMATCH** (name 40, age/sex MATCH) | `conditional` 0 / 1 | registry gap | `SUBMISSION_READY` | SOFT_WARN | PENDING |
| **A + billing** `{facility_id: hyd-punjagutta, price_tier: general_ward}` | bill lines priced against the tariff | MATCH | `conditional` 0 / 1 | registry gap only: both bill lines match the tariff | — | — | — |

Every finding is linked to page 1 of the PDF it came from (`trace_status: linked`).

> **Why A isn't `eligible`:** the registry says cardiology (CAR) claims need *Coronary Angiogram, Echo, Troponin I/T* documented. The reader can only recognise a fixed list of document types (discharge summary, angiogram, consent, operative notes, admission notes, lab report, imaging report, final bill, prescription, pre-auth form). **Echo** and **troponin** aren't on it, so this soft gap appears on **every** cardiology claim, whatever is uploaded. This is a backend limitation (§8, B-G11).

### Sample: one finding (B)

```json
{
  "source": "rule", "rule_key": "pci-needs-angiogram", "rule_version": 1,
  "action": "query", "gap_type": "soft", "reason_code": "REQUIREMENT_UNMET",
  "description": "An angiogram report is required for PCI.",
  "remediation": "Provide the information or documents the rule requires.",
  "trace_status": "linked", "chunk_id": "c831ada2-…", "page_number": 1
}
```

### Sample: intake response (B, trimmed)

```json
{
  "status": "HANDED_OFF", "status_label": "Handed off", "failed_step": null, "error_code": null,
  "identity_check": { "status": "MATCH", "checks": { "name": {"status": "MATCH", "score": 100.0},
                      "age": {"status": "MATCH", "difference_years": 0}, "sex": {"status": "MATCH"} } },
  "gap_run_id": "b27c6745-…", "packet_id": "8f689cc9-…", "integrity_run_id": "a279d523-…"
}
```

---

## 6. Test it in the UI (after §3)

For each scenario folder:

1. **Claims → + New claim.** Copy the fields from `claim.json` → `new_claim_form`. Use a **new** claim ID (e.g. `GC-A-01`). Patient ID = `SYN-GC-10x`.
2. **Step 1 · Upload:** drop the folder's PDFs → all show **INGESTED**.
3. **Step 2 · Read documents:** wait until every file is **READY** (the page refreshes itself).
4. **Step 3 · Check gaps:** fill the form from `claim.json` → `check_gaps_form`:
   - Payer ID `payer-01` (any value works: the sample rules apply to every payer)
   - Member ID, first and last name, birth date, gender from `subscriber`. The name is pre-filled from the claim; **for D, type `Meera` / `Iyer`**.
   - Provider `HOSP-0042` / name, and tick **consent**.
5. **Run gap check**, then compare with the row in §5:
   - the identity banner (red for D)
   - the outcome pill (amber for A/B/D, red for C) and the counts
   - the findings with their source page
   - the packet card: READY, or BLOCKED for C
6. **Refresh the page:** the same results reload (`?intake=` in the URL).
7. **Next: integrity check →** (step 4 uses the `integrity_run_id` that was already queued).

Re-running with the same patient and same PDFs: the files are marked **DUPLICATE** (the check is per patient) and the claim gets no new documents. Create a new patient ID, or regenerate the pack.

---

## 7. Errors you may see

| HTTP / code | When | Fix |
|---|---|---|
| 500 `value too long … varying(36)` | Backend without migration `r8s9t0u1v2w3` | `alembic upgrade head` |
| 422 `NO_RULES_IN_FORCE` (intake `FAILED` at `assemble`) | No active payer rules on the service date | Run the loader (§3.2) |
| 422 `CONSENT_REQUIRED` | Consent not ticked | Tick consent |
| 422 `INTAKE_FACTS_INCOMPLETE` | No admission date in the documents and no service date given; or facts not a valid claim | Enter the service date, or upload labelled documents |
| 409 `INTAKE_FILES_NOT_READY` | A file is still being read | Wait for step 2 to show READY |
| 422 validation, `file_ids` too short | No ready documents on the claim | Upload with the claim open (files must be linked to the claim) |
| 403 `UNAUTHORIZED_USER` | Patient not granted to the tenant | Create the claim through **New claim** (it grants the patient) |
| 409 `IDEMPOTENCY_KEY_REUSED` | Same key, different body | Use "Edit claim details and re-run" |

> **Narrative documents** (free text without labels, like the `01_main_test` PDFs) give few or no facts, because no AI model is configured (`EVAL_PROVIDER=placeholder`). The check still runs, but with little to check. Use `04_gap_check` to see real findings.

---

## 8. Known gaps / follow-ups

| # | Where | Issue | Proposed fix |
|---|---|---|---|
| **B-G11** | Backend `intake/extraction.py` `DOCUMENT_TYPES` | No document type for echo or troponin, so `registry.preauth_diagnostics.CAR` fires on every cardiology claim | Add patterns, e.g. `echo(cardiogra(m\|phy))?` → `echo`, `troponin` → `troponin` (and the other registry diagnostics: NS1, HRCT, CT, X-ray…) |
| FE-1 | `ClaimDetailsForm` | No **billing** (facility + price tier), so tariff checks never run from the UI | Add a facility/tier selector (needs B-G2 `GET /tenant/profile`, or a list from `GET /charges/masters`) |
| FE-2 | `CheckGapsStep` | Provider (`HOSP-0042`), payer id and service date are still hard-coded defaults | B-G2 / B-G3 APIs, or keep as editable defaults |
| B-T1 | Backend test `test_a11_allow_tif_and_tiff` | Fails on `dev`: TIFF uploads are still rejected | Fix A11 in the backend |
| B-T2 | Backend test `test_audit_events_for_each_step_without_conditions` | Fails on `dev`: new `http_request` audit events | Update the test's expected events |

---

## 9. How this was verified

`04_gap_check\test_zz_tmp_gap_check_pack.py` runs the pack through the backend's real FastAPI app with the test fixtures (SQLite in memory, fake S3, no live data touched):
1. loads the 4 reference files through the admin APIs
2. per scenario: `POST /claims` → upload the PDFs with `claim_id` → takes the file ids from `GET /claims/{id}/documents` exactly as the frontend does → `POST /claims/intake` with the frontend's body
3. reads the gap run, packet and pipeline, and writes every response to JSON

Re-run it (it isn't part of the backend repo):

```powershell
copy D:\projects\sky_life_360_test_files\04_gap_check\test_zz_tmp_gap_check_pack.py D:\projects\sky_life_360_dev\tests\integration\end_to_end\
cd D:\projects\sky_life_360_dev
$env:GAP_PACK_OUT="$env:TEMP\gap_pack_results.json"; .venv\Scripts\python.exe -m pytest -q tests\integration\end_to_end\test_zz_tmp_gap_check_pack.py
del tests\integration\end_to_end\test_zz_tmp_gap_check_pack.py
```

Result on 2026-11-03: `1 passed`. The numbers in §5 come from that run.
