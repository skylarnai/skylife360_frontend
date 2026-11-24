# Claim desk: backend dependencies (re-run and second reviewer)

| Field | Value |
|---|---|
| For | Backend (`D:\projects\sky_life_360_dev`) |
| Screens | S03.4 Check gaps (**↺ Edit claim details and re-run**) · S03.5 Integrity · S03.6 Approve & submit |
| Backend checked | `dev@203f135` (9 Nov 2026) |
| Found while | Testing claim `CLM-261109-849F0F` before the town hall |
| Related | [payer_gaps.md](payer_gaps.md) P4 (payer code on the claim) |

---

## 1. What the frontend fixed on its own (no backend change)

| Problem | Fix (frontend, 9 Nov) |
|---|---|
| **↺ Edit claim details and re-run** did nothing: the previous run's intake ID (URL `?intake=` / desk state) kept the results on screen | Proper edit mode: the form opens with the last values, plus **Cancel, keep the last results** |
| Step 4 form pre-filled **example values** (Sunita Menon, birth date `1980-04-02`, `SYN-07`, `POL-SYN-77120`, `HOSP-0042`) wherever the claim had no value. The example birth date made every claim fail the identity check ("The documents name a different patient", age differs by 12 years). | No example values; fields start empty and are filled only from the claim, once, and only where empty. Optional empty fields are left out of the request. Provider ID and name are required, as the backend requires. |
| A background refetch of the claim overwrote what the user had typed | Prefill runs once per claim |
| A **second reviewer** (another browser) opening step 6 saw "Run the integrity check first": the packet ID lived only in the first admin's browser memory | Step 6 falls back to the claim's latest `packet_id`, found by searching the worklist (`GET /claims?q=<claim_id>`) |

The last fix is a **workaround** for D1 below.

## 2. What the backend needs to add

### D1 · `GET /claims/{claim_id}` should say where the claim is

**Today:** `ClaimResponse` has no packet, intake or review IDs. Only the worklist rows (`GET /claims`) carry `packet_id` and `pipeline_stage`. The claim desk keeps the current intake / packet / review IDs in the browser's memory, so they're lost on reload in another browser or by another user.

**Ask:** add to `GET /claims/{claim_id}`:

```json
{
  "...": "existing fields",
  "pipeline_stage": "IN_REVIEW",
  "latest": {
    "intake_id": "…",
    "packet_id": "…",
    "gap_run_id": "…",
    "integrity_run_id": "…",
    "review_task_id": "…",
    "submission_id": null,
    "gap_report_id": null
  }
}
```

**Then the frontend:** every step loads from `latest` (no worklist search, no lost state). Step 5 (Integrity) also works in a second reviewer's browser; today it still depends on browser memory.

### D2 · Keep the step 4 details so a re-run doesn't need retyping

**Today:**
- `POST /claims/intake` takes payer, service date, subscriber (member ID, name, **birth date**, gender) and provider, but `GET /claims/intake/{id}` **doesn't return them**.
- The claim stores only `policy_number`, `patient.name`, `patient.sex` and `patient.age`. **No birth date, payer code, service date or provider.**
- So a re-run (after a send-back, or in another browser) starts from a half-empty form, and the birth date has to be typed again every time. Forgetting it or typing it wrong shows up as "The documents name a different patient".

**Ask (either one; A is smaller):**

| Option | Change |
|---|---|
| **A** | `GET /claims/intake/{id}` returns the request fields it was run with: `payer_id`, `payer_name`, `service_date`, `subscriber{member_id, first_name, last_name, birth_date, gender}`, `provider{provider_id, name, id_qualifier}`. The frontend prefills the re-run from the claim's latest intake (with D1). |
| **B** | Store these on the claim (`POST /claims` and `PATCH /claims/{id}`): `payer_code`, `service_date`, `subscriber_birth_date`, `subscriber_gender`, `provider_id`, `provider_name`. Return them on `GET /claims/{id}`. The New claim form and step 4 both prefill from them. Also covers [payer_gaps.md](payer_gaps.md) P4. |

### D3 · Identity check wording (optional)

`identity_check.checks.age` says `MISMATCH` with `difference_years`, but the review flag only says "The documents name a different patient". Return the field that failed (for example `"reason": "age differs by 12 years (birth date 1980-04-02 vs 58 in the documents)"`), so the reviewer can see it was a typing error and not a different patient.

## 3. Priority

| # | Why | Size |
|---|---|---|
| **D1** | The second reviewer depends on a worklist search today, and step 5 still breaks in another browser | Small |
| **D2** | Retyping the birth date on every re-run caused the false "different patient" flag in testing | Small (A) / medium (B) |
| D3 | Clearer flag for reviewers | Small |

## 4. Demo workaround until D1 and D2 ship

- On step 4, type the **birth date** from the claim's `claim.json` every time (the form no longer hides an example date).
- The second admin opens the claim from the worklist and goes straight to **step 6** (works now). Avoid step 5 in the second admin's window; step 6 shows the integrity results too.
