# Rules and checks: what exactly is checked at "Check gaps", and how

| Field | Value |
|---|---|
| Screen | S03.4 Check gaps (findings) · S03.6 Approve & submit (blockers / flags) |
| Backend | Rule book `app/features/f004_rule_book/rules/` · Gap engine `app/features/f004_claims_rulebook/gap_engine/` · Intake `app/features/f004_claims_rulebook/intake/` |
| Checked against | backend `dev` @ `0c09a8f`, local database `HOSP-001` (6 Nov 2026) |
| Short answer | Three sources are checked: **payer rules** (3 synthetic test rules), the **disease registry** (synthetic) and the **hospital tariff** (synthetic, but not run from the UI). None of it is a real payer's policy. |

---

## 1. The pipeline behind "Check gaps"

```
Uploaded PDFs ──► 1 READ        text of every READY document (no AI: fixed patterns)
                      │          name, age, sex, admission/discharge dates, admission type,
                      │          ICD-10 codes, procedure codes, bill lines, total, document types
                      ▼
                  2 IDENTITY    name/age/sex in the documents vs the subscriber typed in the form
                      │          → MATCH / MISMATCH (MISMATCH = flag "documents name a different patient")
                      ▼
                  3 GAP ENGINE  ┌ a. payer rules      (rule book, JSON Logic)        hard or soft
                      │         ├ b. registry checks  (disease registry, PM-JAY)     always soft
                      │         └ c. tariff checks    (hospital charge master)       always soft, needs billing
                      ▼
                  4 PACKET      SUBMISSION_READY (no hard gap) or REJECTED_GAPS (hard gap)
                      ▼
                  5 INTEGRITY   fraud checks on the packet (separate step, S03.5)
```

**Outcome** shown at Check gaps: `eligible` (no gaps) · `conditional` (soft gaps only) · `not_eligible` (at least one hard gap).

## 2. What the reader extracts from the documents

| Fact | Found by | Example line |
|---|---|---|
| Patient name | `Patient Name:` | `Patient Name: Kavita Deshpande` |
| Age / sex | `Age: 58`, `Sex: Female` | |
| Admission / discharge date | `Date of Admission:` / `Date of Discharge:` | `12/10/2026` |
| Admission type | the words *emergency* / *elective*, *planned* | |
| Diagnosis codes | ICD-10 pattern on diagnosis lines | `Final Diagnosis: …, ICD-10 I21.9` |
| Procedure codes | code pattern on procedure lines | `Procedure: …, code PCI001` |
| Bill lines / total | amount pattern on bill lines, `Grand Total` | `G-PCI001 PTCA WITH STENT 150000.00` |
| Document types | the heading or file name | see the table below |

Recognised document types: discharge summary, angiogram report, consent form, operative notes, admission notes / case sheet, lab report, imaging report (radiology, X-ray, CT, MRI, ultrasound report), final bill / invoice, prescription, pre-auth form. **Anything else (e.g. Echo, Troponin) isn't recognised**, which matters for the registry check (§4).

## 3. Payer rules (rule book): the rules loaded today

These are the **only** rules in force for `HOSP-001`. They're synthetic test rules loaded by `04_gap_check/load_reference_data.py`, written for the test claims. They don't come from a real payer contract.

| Rule | Applies to | Condition (must be true to pass) | Action | If it fails |
|---|---|---|---|---|
| `adults-only` *Adults only* | every claim | `claim.subject_age_years >= 18` | `reject` | **Hard** gap: *"The subject must be an adult."* → packet `REJECTED_GAPS`, approval blocked |
| `cosmetic-exclusion` *Cosmetic procedures are not covered* | procedure `COS001` | `false` (always fails when in scope) | `reject` | **Hard** gap: *"Cosmetic procedures are excluded."* |
| `pci-needs-angiogram` *PCI needs an angiogram report* | procedure `PCI001` | an `angiogram_report` is among the document types | `query` | **Soft** gap: *"An angiogram report is required for PCI."* |

All three: version 1, `ACTIVE`, effective from 2026-04-01, no payer / region / plan restriction (they apply to every payer ID).

### How a rule is evaluated

```
rules in force on the service date (for region / payer / plan, most specific wins)
   └─ for each rule:
        scope matches the claim?  (procedure / diagnosis / package / specialty codes, or applies_to_all)
           no  → not_applicable (ignored)
           yes → evaluate the JSON Logic condition on the claim facts
                   true                    → passed
                   false                   → failed → gap (severity from the action)
                   a fact it reads missing → insufficient_data → soft gap MISSING_DATA
```

| Action | Severity | Reason code |
|---|---|---|
| `reject` | **hard** (needs a cited document page as evidence; without one it becomes soft `CONTEXT_UNAVAILABLE`) | `POLICY_VIOLATION` |
| `require_preauth`, `query`, `flag_review` | soft | `REQUIREMENT_UNMET` |
| fact missing / rule error | soft | `MISSING_DATA` / `EVALUATION_ERROR` |

Facts a rule can read: `claim.diagnosis_codes`, `primary_diagnosis_code`, `procedure_codes`, `package_codes`, `medication_codes`, `specialty_code`, `document_types`, `length_of_stay_days`, `subject_age_years`, `subject_sex`, `admission_type`, `care_setting`, `severity`, `billed_amount`, `preauthorization_obtained`, plus `claim.attributes.<key>`. Conditions use a restricted JSON Logic (comparisons, `and`/`or`/`not`, `in`, `some`/`all`/`none`, …); rules are data, never code.

### Rule lifecycle

`DRAFT` → **validate** (variables, size, conflicts) → `VALIDATED` → **approve** → `APPROVED` → **activate** → `ACTIVE` (supersedes the previous version) → **retire**. Needs `rules:manage` (admins). API: `/api/v1/rules`, dry-run with `POST /api/v1/rules/evaluate`.

## 4. Registry checks (disease registry): always soft

Dataset in use: **`v2026.1-synthetic`** (active), from `04_gap_check/reference_data/disease_registry.xlsx`. For the claim's diagnosis codes:

| Check | Fires when | Example |
|---|---|---|
| `registry.stay_benchmark` | Length of stay > the disease's average stay (+ tolerance) | |
| `registry.preauth_diagnostics.<specialty>` | A mandatory pre-auth diagnostic of that specialty has no matching document type | **Cardiology (CAR): "Coronary Angiogram, Echo, Troponin I/T not documented"** |
| `registry.unknown_diagnosis` | A diagnosis code isn't in the registry at all | |

**Why every cardiology test claim shows "Echo, Troponin I/T not documented":** the reader has no `echo` or `troponin` document type (§2), so these can never count as documented, whatever you upload. This is backend issue **B-G11**. Until it's fixed, treat this soft gap as expected and approve over it with a reason.

## 5. Tariff checks (hospital charge master): not run from the UI

Tariff in force: **`hyd-punjagutta` / `2026-10-synthetic`** (`ACTIVE`): `G-PCI001` PTCA with stent ₹1,50,000 (package, 3 days) · `G-USG001` ultrasound abdomen ₹1,500.

| Check | Fires when |
|---|---|
| `tariff.not_in_tariff` | A bill line matches no charge item |
| `tariff.above_tariff` | Line amount > tariff price × quantity (+ surcharges, tolerance) |
| `tariff.package_stay` | Stay longer than the package's days |
| `tariff.total_mismatch` | Lines don't add up to the billed amount |
| `tariff.tier_not_priced` / `currency_mismatch` / `unavailable` | Missing price tier, wrong currency, no tariff for the facility and date |

**The Check gaps form doesn't send `billing` (facility + price tier), so these checks never run from the UI** (frontend gap **FE-1**). They only run when the API is called with `billing`.

## 6. How the result reaches Approve & submit

| Check gaps result | S03.6 shows | Can approve? |
|---|---|---|
| Hard gap (`reject` rule) | Blocker *"A rule gap rejects this claim"* (`GAP_HARD_REJECTION`) | **No.** Send back or reject. |
| Soft gaps | Flag *"Open rule gaps to fix"* (`GAP_SOFT_GAPS`) | Yes, with a reason |
| Identity mismatch | Flag *"The documents name a different patient"* (`DOCUMENT_IDENTITY_MISMATCH`) | Yes, with a reason |
| Integrity `HARD_FAIL` | Blocker *"Integrity check failed: …"* | No |
| Integrity `SOFT_WARN` | Flag *"Integrity warning: …"*; an admin must **clear** it first, and another admin approves (four-eyes) | Yes, after clearance |

## 7. Expected results for the test claims

| Test claim | Rules | Registry | Outcome |
|---|---|---|---|
| Adult PCI with angiogram (`05` claim 1, `04` A) | all pass | Echo/Troponin soft gap | `conditional`, 0 hard / 1 soft |
| PCI without angiogram (`05` claim 3, `04` B) | `pci-needs-angiogram` soft | Echo/Troponin soft gap | `conditional`, 0 / 2 |
| Child, age 10 (`04` C) | `adults-only` **hard** | Echo/Troponin soft gap | `not_eligible`, 1 / 1 |
| An unread angiogram (file not `READY`) | `pci-needs-angiogram` soft (the reader never saw it) | soft gap | `conditional`, 0 / 2. Fix the file at step 2 and re-run. |

## 8. What's missing before real use

| # | Gap | Owner |
|---|---|---|
| 1 | Real payer policy rules (per payer / plan / region) instead of the 3 test rules | Product + payer contracts |
| 2 | Real disease registry / PM-JAY data instead of the synthetic workbook | Data |
| 3 | B-G11: `echo`, `troponin` (and other registry diagnostics) as document types | Backend |
| 4 | FE-1: send `billing` (facility, price tier) from Check gaps so tariff checks run | Frontend (+ backend facility list) |
| 5 | A rule-book screen for admins (today rules are loaded by script or API) | Frontend |
