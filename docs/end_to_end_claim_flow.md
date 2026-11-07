# End-to-end: from creating users to approve and submit

A step-by-step run of the whole product on a local machine: create the users, open a claim, take it through the six claim desk steps, and either **submit it to the payer** or **send it back** to the doctor's to-do list.

| Field | Value |
|---|---|
| Backend | `D:\projects\sky_life_360_dev`, branch `dev`, at **`49913f8`** or later (`4e426c0` claim desk permissions and gap-report inbox; `73c22bb` doctor flow APIs and scope rule; `49913f8` to-dos) |
| Frontend | `D:\projects\sky_life_360_Frontend`, branch `sashi_dev_frontend` |
| Tenant | `HOSP-001` throughout |
| Quick commands only | [USER_SETUP.md](../USER_SETUP.md) |
| Screen details | [Claim desk S03](02%20-%20Admin/Claim%20Desk/claim_desk_S03.md) · [Doctor / Staff APIs](03%20-%20Doctor%20and%20Staff/doctor_flow_apis.md) |

---

## The flow at a glance

```
 SETUP (once)                         CLAIM (every claim)                                   OUTCOME
 ───────────                          ───────────────────                                   ───────
 1 Start backend + frontend           5 Admin: New claim (patient ID)                       Approve ──► auto-submit ──► payer
 2 First admin (CLI), then the rest   6 Users & access: grant the patient to the doctor        (SUBMITTED / PAYER_REJECTED /
   in Users & access (UI)             7 Claim desk                                              SUBMISSION_FAILED → requeue)
 3 Optional: custom permissions (UI)     1 Upload → 2 Read → 4 Check gaps → 5 Integrity
 4 Register the payer endpoint (CLI)     → 6 Approve & submit                               Send back ──► gap report ──►
                                                                                               to-dos in "My to-dos" (S08):
                                                                                               staff upload / re-scan,
                                                                                               doctors confirm (section 8a)
                                                                                               ──► READY TO RECHECK ──►
                                                                                               admin re-runs step 4 → 5 → 6
```

---

## 1. Start the backend and the frontend

**Backend** (PowerShell):

```powershell
cd D:\projects\sky_life_360_dev
git pull                                  # must include 49913f8
.venv\Scripts\Activate.ps1
python -m alembic upgrade head            # after every pull (49913f8 adds the tasks table and RESOLVED)
```

In the backend `.env` (development only):

| Setting | Value | Why |
|---|---|---|
| `APP_ENV` | `development` | Dev shortcuts are refused in any other environment |
| `AUTH_DEV_SHORTCUTS` | `true` | Fills in the admin MFA code for you. **New in `f0998bb`:** without it there is no `dev_otp` and `/auth/mfa/dev-code` returns 404, so you need a real authenticator app. |
| `REVIEW_AUTO_HANDOFF` | `true` (default) | After the decision the backend queues the submission or sends the gap report by itself |

```powershell
python -m uvicorn app.main:app --reload    # API on http://127.0.0.1:8000 (also runs the submission dispatcher)
```

**Frontend** (second terminal):

```powershell
cd D:\projects\sky_life_360_Frontend
npm install
npm run dev                                 # http://localhost:5173
```

Frontend `.env` (copy from `.env.example`): `VITE_PROXY_TARGET=http://127.0.0.1:8000`, `VITE_DEFAULT_TENANT_ID=HOSP-001`, `VITE_SHOW_API_PANEL=true` (dev API panels and MFA auto-fill), `VITE_ENABLE_ASK=false` (the Ask step needs an LLM).

---

## 2. Create the users

### 2a. The first admin (CLI, once)

Run this in the backend terminal. The server doesn't have to be running.

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email admin@hosp.org --name "Admin One" --role ADMIN --password "SecurePass123!"
```

### 2b. Everyone else (Users & access screen)

Sign in as `admin@hosp.org` (section 5, step 1), open **Users & access**, click **+ New user**, and create:

| Name | Email | Role | Why |
|---|---|---|---|
| Admin Two | `reviewer@hosp.org` | Admin | When integrity flags are raised, the admin who clears them may **not** approve the same claim (four-eyes rule), so a second admin approves |
| K. Iyer | `staff@hosp.org` | Records staff | Hospital-wide documents and sent-back claims |
| Dr. S. Menon | `doctor@hosp.org` | Doctor | Only the patients granted in section 6 |

Give each one a temporary password (8+ characters) and share it. The CLI still works for any of these:

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email doctor@hosp.org --name "Dr. S. Menon" --role VIEWER --password "SecurePass123!"
python -m app.manage list-users --tenant-id HOSP-001
```

> **MFA for admins created in the UI:** the backend creates their MFA secret but never shows it. In development, `AUTH_DEV_SHORTCUTS=true` fills in the code, so it doesn't matter. In production, create admins with the CLI (which prints the secret) until the backend can show it.

### What each role can do (backend defaults since `4e426c0` / `73c22bb`)

| Role (UI label) | Sign in as | MFA | Default permissions | Sees |
|---|---|---|---|---|
| `SUPER_ADMIN`, `ADMIN` (Admin) | Admin | Yes | everything, including `integrity:view`, `integrity:clear`, `claims:approve`, `claims:submit`, `users:manage` | Claims, claim desk (all steps), Users & access. Whole hospital. |
| `MEMBER` (Records staff) | Doctor / Staff | No | `files:upload`, `docs:read`, `rag:ask`, `claims:intake`, `gaps:run`, `packets:build`, `tasks:resolve` | Patient documents, Patient summary, My to-dos. **Whole hospital.** No integrity, approve or submit. |
| `VIEWER` (Doctor) | Doctor / Staff | No | `docs:read`, `rag:ask`, `tasks:resolve` | The same screens, **only for granted patients** |

The frontend shows or hides each action from the `permissions` list in `/auth/me`, never from the role name.

---

## 3. Optional: a doctor who is also a reviewer (custom permissions)

In **Users & access**, select the user and tick the permissions under **Permissions**, for example *Approve or send back claims* and *Submit and requeue claims*. Then click **Save permissions**.

- **Custom permissions replace the role defaults**, so keep the ones the user already needs (for a doctor: *Read documents and patients*). **Reset to role defaults** puts them back.
- Any of `claims:approve`, `claims:submit`, `integrity:view` or `integrity:clear` gives the user the **Claims** and **Work on a claim** tabs. Each step shows only the actions they're allowed to take.
- Changing the role, permissions or active state signs the user out. They pick up the change on their next sign-in.

---

## 4. Register the payer endpoint (needed for "submit")

The submission goes to the payer endpoint whose **payer code** equals the **Payer ID** typed at claim desk step 4. Without one, approving still works, but the hand-off ends with `failed · PAYER_NOT_CONFIGURED`.

```powershell
python -m app.features.f006_human_validation.submission.cli add-payer --tenant-id HOSP-001 `
  --payer-code tpa-01 --name "Example TPA" `
  --base-url https://<payer-host> --submit-path /v1/claims `
  --auth-scheme bearer --auth-secret-ref PAYER_TPA01_TOKEN
python -m app.features.f006_human_validation.submission.cli list-payers --tenant-id HOSP-001
```

- `--payer-code`: lowercase letters, digits, `-` and `_` only. Type exactly this value as **Payer ID** at step 4.
- `--base-url` must be `https://` with a public host. `localhost`, private IPs and `.internal` hosts are refused.
- `--auth-secret-ref` is the **name** of an environment variable that holds the token, never the token itself. Put `PAYER_TPA01_TOKEN=...` in the backend `.env`.
- **Local test without a real payer:** `--base-url https://httpbin.org --submit-path /post --auth-scheme none`. Any 2xx counts as delivered, so the claim reaches `SUBMITTED`. Use **synthetic data only**: the packet is sent to a public service.

---

## 5. Open a claim (Admin)

1. Open `http://localhost:5173`, choose **I'm signing in as → Admin**, and sign in as `admin@hosp.org`. The MFA code fills itself in (needs `AUTH_DEV_SHORTCUTS=true`).
2. You land on **Claims**. Click **+ New claim**.
3. Fill in **Patient ID \*** (the data-owner ID, e.g. `SYN-GC-102`), plus claim ID, name, procedure, payer and so on if you have them. **Create** grants the patient to the hospital and opens the claim desk at step 1.

---

## 6. Grant the patient to the doctor

Doctors (`VIEWER`) see a patient's documents, summary and sent-back claims **only** when the patient is granted to them. Anything else returns 403. Records staff and admins see the whole hospital and need no grants.

**In the UI:** Users & access → select the doctor → **Patients** → choose the patient (or type the patient ID) → **Grant**. Remove it again with **Remove**.

**Or with the CLI:**

```powershell
python -m app.manage list-users --tenant-id HOSP-001                        # copy the doctor's ID
python -m app.manage grant-user-access --tenant-id HOSP-001 --auth-user-id <DOCTOR_ID> --user-id SYN-GC-102
```

The patient list only shows patients who already have a claim or uploaded files, so open the claim first (section 5).

---

## 7. The claim desk, step by step

Route: `/claims/<claim_id>/<step>`. Each step's **API for this screen** panel (dev mode) lists the calls it makes.

| Step | What you do | What the backend does | Permission | Done when |
|---|---|---|---|---|
| **1 · Upload** | Drop the PDFs or images, or a ZIP | `POST /ingestion/upload` (patient ID + claim ID) | `files:upload` | Every file is **ACCEPTED** |
| **2 · Read documents** | Wait; retry files that failed | Text extraction and OCR per file (`GET /claims/{id}/documents` is polled) | `docs:read` | Every file is **READY**. Re-scan the ones it couldn't read and upload them again. |
| 3 · Ask | Hidden while `VITE_ENABLE_ASK=false` | — | `rag:ask` | — |
| **4 · Check gaps** | Fill in the claim details: **Payer ID \*** (= the payer code from section 4), **Policy / Member ID \***, **First / Last name \***, **Provider ID \***, tick **consent**, then run | `POST /claims/intake` reads the documents, checks the payer's rules, **builds the claim packet** and **queues the integrity check** | `claims:intake`, `gaps:run`, `packets:build` | The packet card shows; open gaps are listed with their source page |
| **5 · Integrity** | Read the results | Duplicates, edited documents, invalid IDs, abnormal billing. `GET /integrity/runs/{id}` is polled. | `integrity:view` | Run is **COMPLETED**. Users without `integrity:view` see a note instead of the results. |
| **6 · Approve & submit** | Decide (see below) | `POST /reviews` opens the review task. `POST /reviews/{id}/adjudicate` records the decision, then the auto hand-off runs. | `claims:approve` (decide), `integrity:clear` (clear flags), `claims:submit` (manual submit / requeue) | You see a **Submission** tracker or a "gap report sent" note |

### Step 6 in detail

The left panel, **Before you approve**, comes from the review task: documents read, open rule gaps, **blockers** (nobody can approve over these), **flags** (approving over them needs a reason) and integrity findings.

**A. Integrity flags (stage `INTEGRITY_REVIEW`).** Approval is locked until someone clears the flags.
1. `admin@hosp.org` writes why the flags don't stop the claim and clicks **Clear integrity flags** (`integrity:clear`).
2. Sign out, then sign in as **`reviewer@hosp.org`** to approve. The admin who cleared the flags can't approve the same claim (four-eyes rule).

**B. Decide** (`claims:approve`):

| Decision | When | Reason needed? | Auto hand-off |
|---|---|---|---|
| **Approve** | No blockers, flags cleared | Only when approving over flags | Submission queued to the payer → `handoff.action = submitted` |
| **Approve · warning is a false alarm** | An integrity warning that can be marked a false positive | Yes | Same as Approve |
| **Send back to the hospital** | Anything that needs fixing | Yes | Gap report created for the patient → `handoff.action = gap_report` |

**C. After the decision.** The screen keeps its state after a reload. It reads `handoff` from `GET /reviews/{id}`, the submission from `pipeline.submission`, and the gap report from `pipeline.gap_report`.

| You see | Meaning | What to do |
|---|---|---|
| **Submission** tracker: Queued → Sending → Received by payer | Auto-submitted | Wait. It polls every 3 s. |
| Error "hand-off failed (PAYER_NOT_CONFIGURED)" + **Submit to …** button | No active payer endpoint for that Payer ID | Register it (section 4), then click **Submit to …** (`claims:submit`) |
| "Hand-off skipped: …" + **Submit to …** | Auto hand-off is off, or it was skipped | Click **Submit to …** |
| **PAYER REJECTED** + the payer's message | The payer refused the claim | Final; it can't be resent as is |
| **Sending failed after every attempt** + message | Dead-lettered | Type a reason and click **Requeue** (`claims:submit`) |
| "A gap report was sent to the hospital" | Sent back | The doctor and staff see it in **My to-dos** (section 8) |

The error text shown is `last_error_message` from the backend (the payer's detail, or plain English for the code), followed by the code.

### Claims worklist: the REVIEW column (`pipeline_stage`)

| Badge | `pipeline_stage` | Meaning |
|---|---|---|
| — | `null` | No packet yet |
| CHECKING | `IN_PIPELINE` | Packet built, integrity running |
| IN REVIEW | `IN_REVIEW` | Review task waiting for a decision |
| APPROVED | `APPROVED` | Approved, not handed to submission yet |
| REJECTED | `REJECTED` | Rejected, no gap report sent |
| SENT BACK | `SENT_BACK` | Gap report sent to the hospital; to-dos open |
| READY TO RECHECK | `READY_TO_RECHECK` | The hospital finished every to-do (report `RESOLVED`). Open the claim and re-run Check gaps |
| SUBMITTING | `SUBMITTING` | Queued, sending or waiting to retry |
| SUBMITTED | `SUBMITTED` | Accepted by the payer |
| PAYER REJECTED | `PAYER_REJECTED` | Rejected by the payer |
| SEND FAILED | `SUBMISSION_FAILED` | Dead-lettered; requeue from step 6 |

---

## 8. Doctor / staff side

Sign out. Choose **I'm signing in as → Doctor / Staff** and sign in as `doctor@hosp.org` or `staff@hosp.org` (no MFA).

| Tab | What it shows | API |
|---|---|---|
| **Patient documents** (S05) | Tiles (documents, ready, couldn't read, patients), and a table filterable by patient, type and status. Click a file to read its text page by page. | `GET /files`, `GET /patients`, `GET /files/{id}/text` |
| **Patient summary** (S07) | Header (name, sex, age, procedure, diagnosis, treating doctor, admission and discharge dates, claim stage) plus the patient's documents. No amounts. | `GET /patients`, `GET /patients/{id}`, `GET /files?patient=` |
| **My to-dos** (S08), tab **To do** | One card per thing to fix, with an action per type (table below). Filter Open / Done / All, and Mine / Everyone's. The tab badge is the number of open to-dos. | `GET /tasks`, `POST /tasks/{id}/resolve`, `POST /ingestion/upload` |
| **My to-dos** (S08), tab **Sent-back claims** | One card per gap report: items to fix, "2 of 3 done", `RESOLVED` chip when all are done. **Show details** lists the breakdown and each to-do. | `GET /claims/gap-reports?status=AVAILABLE\|RESOLVED`, `GET /claims/gap-reports/{id}` |

The doctor sees only granted patients everywhere. Records staff see the whole hospital.

### 8a. Closing the send-back loop (to-dos)

**Send back** creates one to-do per fixable gap, plus a re-scan for each unreadable file. A hard rejection creates none, and its card says the hospital can't fix it.

| To-do | Who gets it | Button | What it needs |
|---|---|---|---|
| DOCUMENT NEEDED | Records staff | **Uploaded** | The new file: **Upload a file** on the card, or pick one uploaded after the to-do was created |
| RE-SCAN | Records staff | **Mark done** | Optionally the new scan (same picker) |
| PLEASE CONFIRM | Doctors | **Confirm** | An optional note |
| INSURER QUESTION | Doctors | **Send reply** | A reply (required) |
| SIGNATURE NEEDED | Doctors | **Mark as signed** | An optional note |

Insurer questions and signatures are only created by the API for now; the claim desk has no button for them yet.

Test it:
1. Admin: send a claim back with soft gaps (step 6, **Send back**).
2. Records staff (`staff@hosp.org`): **My to-dos → To do**, open a DOCUMENT NEEDED card, **Upload a file** (or pick one), then **Uploaded**. Do the rest the same way; a doctor confirms the PLEASE CONFIRM ones.
3. The report shows "n of n done" and **RESOLVED**; the worklist shows **READY TO RECHECK**.
4. Admin: open the claim → step 4 **Check gaps**. Fixed gaps show **FIXED** (when and the note). Click **↺ Edit claim details and re-run**: the new documents are checked and a new packet is built. Continue with Integrity → Approve → Submit.

Anyone with `tasks:resolve` can also ask for a re-scan from **Patient documents**: select a file → **Request re-scan** (page and reason optional). Asking twice for the same file returns the open request.

Known limits:
- **Download report** is disabled. `POST /gap-reports/{id}/links` still needs a user-bound API key (`403 GAP_REPORT_USER_KEY_REQUIRED`); that's a backend follow-up.
- Nothing re-runs Check gaps automatically; the admin does it on **READY TO RECHECK**.
- The S07 timeline, searching inside documents, Ask (S06) and the suggested insurer reply wait for the AI models.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Email or password is incorrect" | User doesn't exist in `HOSP-001` | `python -m app.manage list-users --tenant-id HOSP-001` |
| MFA code not filled in | `AUTH_DEV_SHORTCUTS` isn't `true`, or `APP_ENV` isn't `development` | Set both in the backend `.env` and restart uvicorn |
| Sent back to sign-in: "Too many wrong codes, or this code was already used" | The MFA token allows 5 wrong codes and one successful use | Sign in again to get a new code |
| "Too many attempts…" (`429 ACCOUNT_LOCKED`) | Repeated failures locked the account | Wait, or reset the password (`reset-token`) |
| "Access denied" on Claims | User has no reviewer permission and isn't an admin | Use an admin, or give custom permissions (section 3) |
| `403 INSUFFICIENT_PERMISSIONS: Missing required permission: …` | The action needs that permission | Use a user that has it. `MEMBER` lost integrity, approve and submit in `4e426c0`. |
| Approve is locked after you cleared the flags | Four-eyes rule | Approve as the second admin |
| `409` on Confirm decision | Someone else changed the task (stale version) | The task reloads; decide again |
| Hand-off `failed · PAYER_NOT_CONFIGURED` | No active payer whose code = Payer ID | Section 4, then **Submit to …** |
| Integrity step shows only a note | User lacks `integrity:view` | Expected. The reviewer sees the integrity result in step 6. |
| Blockers read "An integrity check needs attention" | User lacks `integrity:view`, so the check name is hidden | Expected |
| Doctor sees empty lists, or "This patient isn't one of yours" | The patient isn't granted to that doctor | Section 6 |
| Patient missing from the grant picker | The patient has no claim or files yet | Open the claim first (section 5) |
| Users & access says "Access denied" | User lacks `users:manage` | Use an admin |

---

## 10. Who does what: summary

| Step | Admin One | Admin Two | Records staff (`MEMBER`) | Doctor (`VIEWER`) |
|---|---|---|---|---|
| Create users, grant patients, set permissions | ✓ | ✓ | — | — |
| New claim, upload, read, check gaps (claim desk) | ✓ | ✓ | — (uploads only from a to-do card) | — |
| See integrity results | ✓ | ✓ | — | — |
| Clear integrity flags | ✓ | ✓ (but not on a claim they then approve) | — | — |
| Approve / send back | ✓ | ✓ | — | — (✓ with custom permissions) |
| Submit / requeue | ✓ | ✓ | — | — (✓ with custom permissions) |
| Patient documents and summary | whole hospital | whole hospital | whole hospital | granted patients |
| My to-dos: documents and re-scans | — | — | ✓ (whole hospital) | — (sees them under Everyone's) |
| My to-dos: confirmations, insurer replies, signatures | — | — | — | ✓ (granted patients) |
| Request re-scan (S05) | — (no tab; API allows it) | — | ✓ | ✓ |
| Re-run Check gaps on READY TO RECHECK | ✓ | ✓ | — | — |

---

## 11. Is this the complete workflow?

**Yes, for the basic flow.** Both branches now close:

- **Approve:** create users → grant patients → new claim → upload → read → check gaps (packet) → integrity → clear flags (admin A) → approve (admin B) → auto-submit → track, requeue if it fails.
- **Send back:** gap report + to-dos → records staff upload / re-scan, doctors confirm → report `RESOLVED`, worklist `READY TO RECHECK` → admin re-runs Check gaps (new packet) → integrity → approve → submit.

**Still open (not blocking the basic flow):**

| # | Gap | Impact | Who |
|---|---|---|---|
| 1 | Gap report download blocked for signed-in users | Doctors and staff see the summary and to-dos, not the report file | Backend |
| 2 | Insurer questions and signature requests have no button on the claim desk | Only the API can create them (`POST /tasks`) | Frontend, when needed |
| 3 | Re-check isn't automatic | The admin has to notice READY TO RECHECK in the worklist | Backend (optional) |
| 4 | Payer endpoints only via CLI | An admin can't add or fix a payer in the app | Backend API + frontend screen (later) |
| 5 | MFA secret not shown for admins created in the UI | Fine in development; in production, create admins with the CLI | Backend |
| 6 | Admins have no My to-dos tab | They follow progress in the worklist and Check gaps instead | Product decision |
| 7 | Suggested insurer reply, signature detection, timeline, Ask | Need the AI models | Later |
