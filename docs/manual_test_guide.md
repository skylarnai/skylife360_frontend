# Sky Claims — Manual Test Guide (9–11 Nov 2026 changes)

| Field | Value |
|---|---|
| Scope | Everything merged 9–11 Nov 2026 in both repos: Google sign-in, roles, claim desk resume and prefill, patient-data masking, payer / insurance (mock insurer), Indian-document extraction, security hardening, UI polish |
| Backend | `sky_life_360_dev` **`origin/dev` @ `40c6443`** (pull first: a local copy at `14fdb30` misses masking fixes, query fields and the role ceiling) |
| Frontend | `skylife360_frontend` **`sashi_dev_frontend`** (this guide's commit or later) |
| Data | Synthetic only: patient IDs `SYN-P-…`, claim IDs `SUV-…`, policies `MOCK-POL-…`. Never real patient data. |
| How to record | Fill the **Result** column with Pass / Fail / Blocked and a note. For a Fail, add the claim ID, the time, and a screenshot of the dev API panel (**Ctrl+Shift+A**). |

---

## 1. What is new

### Backend (`sky_life_360_dev`)

| Commit | Change | Tested in |
|---|---|---|
| `26bf5d7`, `ed1f674` | Secrets from AWS Secrets Manager; Google client ID / secret from AWS, other Google settings from a local keys file; **`AUTH_MFA_ENABLED`** switch (default off) | §3 |
| `5436d59`, `933fba3` | Google sign-in: unknown emails refused unless **`GOOGLE_OAUTH_ALLOW_JIT`** is on | A2, A3 |
| `65cb115` | User access allowlist: email + role checked at every login | A4 |
| `bd14c0d` | Claim **birth date**, `payer_code`, `service_date`; `PATCH /claims/{id}`; **tenant provider** (hospital settings); `GET /claims/{id}` returns `latest` + `pipeline_stage`; existing patient prefill | C, D |
| `0b42452` | Claim-desk permissions enforced: staff (MEMBER) no longer create claims or run Check gaps | B4 |
| `14fdb30` | **Payer gateway + mock insurer**: payer status, query / appeal / withdraw, pre-check, scenarios, signed callbacks, settlement, payer stages | F, G, H |
| `4927aa1` | **Document text masked** for display; original text / file only with `phi:unmasked`, audited | E |
| `82609bb` | **Patient fields masked in every API response** for MEMBER / VIEWER; masked values can't be written back | E |
| `64bc058` | Audit API: admins only, own tenant only; **role ceiling** (nobody grants more than they have; no self-changes) | B, I |
| `2f1840e` | Payer callback hardening; payer status scoped for doctors; **refresh needs `claims:submit`**; mock insurer actions need `claims:submit`; **query answers carry fields** (`preauth_ref`) | G6, I |
| `bef088f` | Extraction for Indian hospital documents (`03-Nov-2026`, table cells, `Male, 42`, `Rs. 96,000`, no CPT from registration numbers); **`MISSING_PRIMARY_DIAGNOSIS` blocker**; rule OVERLAP warning | D6–D8 |

### Frontend (`skylife360_frontend`)

| Commit | Change | Tested in |
|---|---|---|
| `42db96f` | Demo polish: API panel hidden behind **Ctrl+Shift+A**; refreshed login page | J1, J2 |
| `c57b29d` | In-table scroll, numbered pager, full-width main area, stat cards | J3 |
| `7378290` | Google sign-in as a full-page redirect | A1 |
| `ec11ae1` | Records staff: no claim desk (matches backend) | B4 |
| `29a3e68` | Clinical Ask behind an env flag | J4 |
| `522ff5a` | Claim desk resumes from the claim's latest run; new claim prefills a known patient; DOB, Payer ID, service date; provider optional with a tenant provider | C, D |
| `203dad1` | **Payer integration**: payer status panel, submit form with claim type / dates / scenario, pre-check, **Insurance** admin page, payer stages | F, G |
| `32822c0`, `e35dd64` | Masked text in the desk; Show original / Open only with `phi:unmasked`; masked-data note; masked values never prefilled or submitted | E |
| `d457b29` | Approve & submit shows the real approver from the audit trail; query answer sends requested fields | D10, G6 |
| `c414e55` | **Primary diagnosis (ICD-10)** field on Check gaps; label for the `MISSING_PRIMARY_DIAGNOSIS` blocker; Integrity step says "Integrity check skipped" for hard-gap claims | D7–D9 |
| this commit | Payer **Refresh** shown only with `claims:submit` (backend `2f1840e`) | G11 |

---

## 2. Test accounts

Create these on **Users & access** (after the user / claim reset), or with `docs/USER_MANAGEMENT_COMMANDS.md` in the backend.

| Account | Backend role | Sees | Use for |
|---|---|---|---|
| `admin` (your Google account) | ADMIN | Everything, real (unmasked) data, Insurance page | Most tests |
| `staff` | MEMBER | Patient documents, to-dos; **masked** patient data; no claim desk | B4, E |
| `doctor` | VIEWER | Only granted patients; **masked** data | B5, E, I |
| `reviewer` | VIEWER + custom `claims:approve`, `claims:submit` | Claims + claim desk; masked data | B6, G11 |
| `compliance` (optional) | COMPLIANCE | Claims, integrity | F7 |

---

## 3. Setup checklist (before testing)

| # | Check | How |
|---|---|---|
| S1 | Backend on `origin/dev` and migrated | `git pull` → `alembic upgrade head` → restart |
| S2 | Mock insurer on | `MOCK_PAYER_ENABLED=true`, and `APP_ENV` is not `production`. `MOCK_TIME_SCALE` (default 60) speeds the payer up: 1 payer hour ≈ 1 minute |
| S3 | MFA | `AUTH_MFA_ENABLED=false` for the demo (login checks only the user list), `true` to test MFA |
| S4 | Google | Client ID / secret in AWS `skylife360/prod-secret-keys`; redirect + frontend URLs in the keys file (`SECRETS_FILE_PATH`); `GOOGLE_OAUTH_ALLOW_JIT=false` unless testing A3 |
| S5 | Hospital provider | `GET /auth/me` returns `hospital.provider_id` / `provider_name` (set via `PATCH /api/v1/tenant/settings` or `manage.py set-tenant-settings`) |
| S6 | Frontend | `npm install` → `npm run dev`; sign in once as admin |

---

## 4. Test cases

### A. Sign-in

| ID | Steps | Expected | Result |
|---|---|---|---|
| A1 | Login page → **Sign in with Google** | Whole page goes to Google (no popup), back to the app signed in; admin lands on **Claims** | |
| A2 | Sign in with a Google account that is **not** in Users (JIT off) | Refused with a clear message; no user is created | |
| A3 | Set `GOOGLE_OAUTH_ALLOW_JIT=true`, repeat A2 | User created on first sign-in with the default role; set it back to false after | |
| A4 | Disable `staff` on Users & access, then sign in as `staff` | Refused; an open `staff` session is signed out on its next call | |
| A5 | `AUTH_MFA_ENABLED=true`, password login | MFA code step appears; wrong code refused, right code signs in | |

### B. Users, roles and the role ceiling

| ID | Steps | Expected | Result |
|---|---|---|---|
| B1 | As admin create `staff`, `doctor`, `reviewer` (above) | Users listed with role chips; `reviewer` shows **CUSTOM** | |
| B2 | Admin edits **own** account: change role, permissions, or disable | Refused: "You cannot change your own role, permissions or active status" | |
| B3 | Admin tries to give a user **SUPER_ADMIN**, or a permission admin does not hold | Refused (403 "You cannot assign…" / "cannot grant permissions you do not have") | |
| B4 | Sign in as `staff` | Tabs: Patient documents, Patient summary, My to-dos (Ask only if enabled). **No** Claims / Work on a claim. Opening `/claims` shows access denied | |
| B5 | Sign in as `doctor` | Sees only granted patients; no Claims tab | |
| B6 | Sign in as `reviewer` | Gets Claims + Work on a claim besides the clinical tabs; no Users, no Insurance | |

### C. New claim and patient prefill

| ID | Steps | Expected | Result |
|---|---|---|---|
| C1 | Claims → New claim: Patient ID `SYN-P-1001`, name, sex, age 42, **Date of birth** consistent with 42, **Payer ID** `payer-01`, **Service date**, policy number | Claim created and listed | |
| C2 | New claim with DOB that disagrees with the age by more than a year | Refused: birth date and age don't match (`BIRTH_DATE_AGE_MISMATCH`) | |
| C3 | DOB in the future | Field won't accept it (max = today) / backend refuses | |
| C4 | New claim, type Patient ID `SYN-P-1001` and leave the field | Hint "Existing patient: details filled in from claim …"; only empty fields are filled | |
| C5 | Repeat C4 as `reviewer` (masked data) | Masked values (initials, `••••1234`) are **not** prefilled | |

### D. Claim desk

Steps: Upload → Read documents → (Ask, only with `VITE_ENABLE_ASK=true`) → Check gaps → Integrity → Approve & submit. Referred to by name below.

| ID | Steps | Expected | Result |
|---|---|---|---|
| D1 | **Upload**: discharge summary, final bill, investigation report (PDF / scan / ZIP) | Files reach READY; failures say "Couldn't read" | |
| D2 | **Read documents** → View text, as admin | Masked text with a note; **Show original** toggles real text; **Open** opens the file | |
| D3 | **Check gaps** on a claim with no DOB stored | Note "Type the date of birth once…"; after the run the DOB is saved on the claim and prefilled next time | |
| D4 | Check gaps with DOB different from the claim's | Run succeeds; a warning says the DOBs differ (claim not overwritten) | |
| D5 | Check gaps with the hospital provider configured, provider fields empty | Provider labelled "(hospital default)", run allowed. Without a tenant provider: provider required (422 `PROVIDER_NOT_CONFIGURED` if bypassed) | |
| D6 | Upload an Indian-format discharge summary: `Date of Admission \| 03-Nov-2026`, `(Male, 42)`, `Rs. 96,000`, doctor `Reg. No TSMC/TEST/45821` | Extracted admission date 3 Nov 2026, sex M, age 42, amount 96,000; **no** procedure code read from the registration number | |
| D7 | Documents without a readable ICD-10 code → Check gaps | **Primary diagnosis (ICD-10)** field available; filled code is used | |
| D8 | Run Check gaps without any primary diagnosis, go to **Approve & submit** | Blocker "missing primary diagnosis" — approval not possible | |
| D9 | A claim whose Check gaps result is a hard gap (rejects) → **Integrity** | "Integrity check skipped…" — no Run button | |
| D10 | Approve on **Approve & submit**, reload, open the claim in **another browser** as another admin | Same step, results and decision; approver name, reason and time come from the audit trail (not the signed-in user) | |
| D11 | Worklist after each step | Stage chip follows: CHECKING → IN REVIEW → APPROVED → SUBMITTED → payer stages (G) | |

### E. Patient-data masking (`phi:unmasked`)

| ID | Steps | Expected | Result |
|---|---|---|---|
| E1 | As `staff` / `doctor` open Patient summary and Patient documents | Note "Patient names, policy numbers, birth dates and file names are masked for your role"; names as initials, policy / member numbers last 4, no DOB, file names generic | |
| E2 | Same user: patient ID, claim ID, age, sex, doctor, payer, procedure, amounts | Shown **unmasked** | |
| E3 | Same user: view document text | Masked text; **no** Show original, **no** Open | |
| E4 | Admin: Show original / Open a file | Works; backend audit has `ORIGINAL_TEXT_VIEWED` / `ORIGINAL_FILE_DOWNLOADED` | |
| E5 | `reviewer` on Check gaps where member ID / name is masked | **Run gap check** disabled with an explanation | |
| E6 | (API) send a masked value back, e.g. PATCH a claim with `patient_name: "R. K."` | 422 `MASKED_VALUE_WRITE`; patient-detail PATCH without `phi:unmasked` → 403 | |
| E7 | Ask (if enabled) as `doctor` | Question, answer and sources masked | |
| E8 | Dev API panel / network tab as `staff` | Responses carry header `X-PHI-Masked: true` | |

### F. Insurance setup (admin page `/insurance`)

| ID | Steps | Expected | Result |
|---|---|---|---|
| F1 | Mock insurer **off** → open Insurance | "The mock insurer is not enabled on this backend…" | |
| F2 | Mock insurer on → open Insurance | Banner "These are mock insurers…"; table lists `MOCK_STANDARD` (and others seeded) | |
| F3 | **Add or update an insurer**: `MOCK_STRICT_DEMO`, Strict, strictness 1.5 | Saved, listed. Code without `MOCK_` prefix refused | |
| F4 | **Route a payer**: Claim Payer ID `payer-01` → `MOCK_STANDARD` | "payer-01 → MOCK_STANDARD" | |
| F5 | **Create a test policy**: `MOCK-POL-1001`, Patient ID `SYN-P-1001`, sum insured 5,00,000, room rent cap 4,000, co-pay 0 | "Created MOCK-POL-1001 for patient SYN-P-1001"; same number again → error | |
| F6 | **Look up** `MOCK-POL-1001` | Insurer, patient, status, validity, sum insured / used, co-pay, room cap | |
| F7 | As `compliance` / `reviewer` | No Insurance tab; `/insurance` shows access denied | |

### G. Submit to the payer and the payer lifecycle

Use a claim with Payer ID `payer-01`, policy `MOCK-POL-1001`, patient `SYN-P-1001`, approved on **Approve & submit**. If the automatic hand-off already submitted it, use **Mock scenario** on a fresh claim (manual submit appears when hand-off is skipped / failed / off). After each submit, click **Process due payer decisions now** on Insurance (or wait ~1 minute) and watch the **At MOCK…** panel on **Approve & submit**.

| ID | Scenario / action | Expected | Result |
|---|---|---|---|
| G1 | **Pre-check with the payer** (claim type Final, no discharge date) | Likely decision, claimed, expected payable, "Policy on file: Yes", issues (e.g. Q01/Q05) and "Add before sending: …"; nothing is sent | |
| G2 | Submit, scenario `force_approve` | Submission tracker: Queued → Sending → Received; panel: **Mock insurer, not a real claim** banner, status Approved, approved = claimed; worklist **PAYER APPROVED**; header shows **MOCK INSURER** | |
| G3 | `force_partial_room_rent` | Partially approved; reason line **P01** with a deduction; worklist **PARTLY APPROVED** | |
| G4 | `force_query_docs` | Query raised: asks for Discharge summary + Final bill with a deadline; worklist **PAYER QUERY**; a to-do in **My to-dos**. **Answer query** → tick both → Send → Query responded → after the worker: Approved; to-do closed | |
| G5 | `force_query_then_reject` → answer the query | Then **Rejected (R18)**; **Appeal** available | |
| G6 | `auto`, claim type **Final**, **no pre-auth reference** | Query **Q05** asks for the field **preauth_ref**. Answer query shows an input for it → enter `PA-2026-11-0031` → Send → payer re-reviews (no longer stuck on Q05) | |
| G7 | `force_reject_waiting_period` → Appeal with notes | Rejected **R07**; appeal accepted, rejected again; Appeal button gone afterwards (limit 1, API 409 `APPEAL_LIMIT_REACHED`) | |
| G8 | `force_reject_then_appeal_approve` → Appeal | Rejected, then **Approved** after appeal; worklist APPEALED → PAYER APPROVED | |
| G9 | `force_query_timeout`, don't answer | After ~1 payer hour (~1 min): **Closed** (R15) | |
| G10 | `force_settlement` | Approved → Payment pending → **Settled**; panel shows "Paid ₹… · UTR **MOCKUTR-…**"; worklist SETTLED | |
| G11 | `reviewer` vs `doctor` on a submitted claim | `reviewer`: Refresh, Answer / Appeal / Withdraw. `doctor` / anyone without `claims:submit`: no Refresh, no actions ("Someone with the claims:submit permission…") | |
| G12 | **Withdraw** with a reason on an un-settled claim | Status Withdrawn; worklist WITHDRAWN; Withdraw not offered after settlement | |
| G13 | Claim types: Pre-authorisation (no discharge date needed) | Rests at Approved (pre-auth) | |
| G14 | Mock scenario dropdown as `reviewer` | Not shown (admins only) | |

### H. Fault scenarios (QA, optional)

| ID | Scenario | Expected | Result |
|---|---|---|---|
| H1 | `force_fault_503` | Tracker shows a retry, then Received | |
| H2 | `force_fault_timeout` | Retry gets the original acknowledgement; one claim at the payer, not two | |
| H3 | `force_fault_validation` | **Send failed / Payer rejected** at intake; no payer panel (404 `PAYER_STATUS_NOT_FOUND`) | |
| H4 | `force_fault_callback_lost` | Status still arrives (poller); Refresh also pulls it | |
| H5 | `force_fault_duplicate_callback` / `out_of_order` / `bad_signature` / `receiver_down` / `partial_payload` | Final status correct, applied once | |

### I. Security checks (API panel or Swagger `/docs`)

| ID | Call | Expected | Result |
|---|---|---|---|
| I1 | `GET /api/v1/audit/events` as `staff` | 403 "Only administrators can read the audit trail" | |
| I2 | Same as admin with another `tenant_id` | 403 | |
| I3 | `POST /api/v1/claims/submissions/{id}/payer-status/refresh` as `doctor` | 403 | |
| I4 | `POST /api/v1/mock-payer/claims/...` (submit / withdraw) as `doctor` | 403 | |
| I5 | `GET .../payer-status` as `doctor` for a non-granted patient | 403 / 404 | |
| I6 | `POST /api/v1/payer-callbacks/events` with a wrong `X-Signature` | 401 | |
| I7 | `POST /api/v1/mock-payer/claims` with `external_reference` = an existing submission ID | 409 `EXTERNAL_REFERENCE_IN_USE` | |

### J. UI regression

| ID | Steps | Expected | Result |
|---|---|---|---|
| J1 | Any screen, press **Ctrl+Shift+A** | API panel toggles; hidden by default | |
| J2 | Login page | New side panel and card; Google button and password / OTP inputs work | |
| J3 | Claims worklist with > 25 claims | Table scrolls inside itself; numbered pager; stat cards on top | |
| J4 | `VITE_ENABLE_CLINICAL_ASK=false` / `true` (and `VITE_ENABLE_ASK=false`) | "Ask about a patient" tab hidden / shown; Ask desk step only with `VITE_ENABLE_ASK=true` | |
| J5 | Phone width (≈ 390 px) on Approve & submit and Insurance | No horizontal page scroll; forms stack | |

---

## 5. Not testable yet / known limits

| Item | Why |
|---|---|
| Model training from payer outcomes (LoRA) | Trainer is a placeholder; de-identified training samples are created, no model is trained |
| Claim risk band in the pre-check | Shown only after a simulation + model training run on the backend |
| Real insurers | Only mock insurers; real payer endpoints need credentials and an HTTPS adapter |
| Users / claims reset | Pending confirmation (shared `prod` database) — keep insurers, policies and payer routes |

## 6. Sign-off

| Area | Tester | Date | Pass | Fail | Blocked |
|---|---|---|---|---|---|
| A–B Sign-in, roles | | | | | |
| C–D Claim + desk | | | | | |
| E Masking | | | | | |
| F–H Insurance + payer | | | | | |
| I Security | | | | | |
| J UI | | | | | |
