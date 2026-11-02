# S07 — Patient summary

| Field | Value |
|---|---|
| Screen | S07 — Patient summary (header and timeline from the documents) |
| Role | Doctor, Records staff, Admin (`docs:read`) |
| Route | `/patients/:patientId` (the tab opens the last patient viewed, or the first one) |
| Prototype reference | `viewPatients()`, `TL` |
| Depends on | S00, S06 (`PatientPicker`) |
| Status | Planned |
| API readiness | **NEEDED** (`/patients/{id}`, `/patients/{id}/timeline`) |

## 1. Purpose

Give a doctor a one-page view of a patient's stay: who they are, what was diagnosed and done, the key dates, and a timeline of events, each linked to the document it came from.

## 2. Users and permissions

`docs:read`. Doctors see only their care-team patients. Claim amounts, payer details and integrity findings are never shown here; the rail says so.

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────┐ ┌ rail ─────────────────────────┐
│ Patient summary                    Patient [SYN-P-1042 ▾]  │ │ DOCUMENTS · 6                 │
│ SYN-P-1042 · F · 46 (mono, accent)                         │ │ opd_consultation.pdf  [READY] │
│ Laparoscopic cholecystectomy (h3 20px)                     │ │ usg_abdomen.pdf       [READY] │
│ K80.2 · Calculus of gall bladder   Treating doctor Dr. S. Menon │ discharge_summary (1) [DUP]  │
│ Admitted 08 Oct · Discharged 11 Oct   Claim [PRE-SUBMISSION] │ │ Claim amounts, payer details │
│ TIMELINE · FROM THE PATIENT'S DOCUMENTS                    │ │ and integrity findings are   │
│ 04 Oct  ●  OPD consultation · Symptomatic cholelithiasis…  │ │ not shown to doctors and     │
│            Source: opd_consultation.pdf (teal)             │ │ staff.                        │
│ 09 Oct  ●  Surgery · Laparoscopic cholecystectomy under GA │ │ API (dev)                     │
│            Source: operation_note.pdf                      │ └───────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

Timeline rows: grid `96px · 14px dot · text`; the dot is accent with a teal halo.

## 4. Content and states

- Header: patient ID, sex, age, procedure, diagnosis (code + name), treating doctor, admission and discharge dates ("—" when still admitted), claim stage chip (stage only, never amount).
- Timeline: date, event title, short text, source file (link). Oldest first.
- Documents rail: every file of the patient with its status chip; clicking opens S05 with the file selected.
- Empty timeline: "No dated events found in this patient's documents yet."
- Loading and error: S00 defaults.

## 5. Interactions

- Picking another patient changes the route.
- Source links and document links open S05 with that file selected.

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/patients/{user_id}` | **NEEDED** | Header: sex, age, diagnosis, procedure, doctor, admission and discharge dates, claim stage |
| GET | `/api/v1/patients/{user_id}/timeline` | **NEEDED** | `[{ date, title, text, codes?, source: { file_id, original_filename, page_number } }]` |
| GET | `/api/v1/files?patient=` | **NEEDED** | Documents rail (same endpoint as S05) |
| POST | `/api/v1/claims/intake/extract` | READY | Already pulls claim facts (dates, codes) with citations; the backend can use it to seed the timeline |

## 7. Data mapping

| API | UI |
|---|---|
| `sex`, `age` | "F · 46" |
| `diagnosis.code` + `diagnosis.name` | "K80.2 · Calculus of gall bladder" |
| `admission_date`, `discharge_date` | "Admitted 08 Oct · Discharged 11 Oct" |
| `claim_stage` | Stage chip (S00 map) |
| timeline `source.original_filename` | "Source: …" link |

## 8. Components

S00: `Chip`, `Lbl`, `TwoColumn`, `ApiRail`. Reuse `PatientPicker` (S06). New in `features/patients/components/`: `PatientHeader`, `Timeline`, `TimelineItem`, `PatientDocumentsRail`.

## 9. Files to create

```
src/features/patients/
  pages/PatientSummaryPage.jsx
  hooks/usePatient.js  usePatientTimeline.js
  components/PatientHeader.jsx  Timeline.jsx  TimelineItem.jsx  PatientDocumentsRail.jsx
  api/patientsApi.mock.js   add the four prototype timelines
```

## 10. Acceptance criteria

1. With the mock, SYN-P-1042 shows the prototype header and its five timeline events with sources.
2. No amount, payer or integrity data appears anywhere on the page.
3. Source and document links open S05 with the right file selected.
4. A patient still in hospital shows "Discharged —".

## 11. Backend gaps and open questions

- **NEEDED:** `GET /patients/{id}` and `GET /patients/{id}/timeline`. Today no patient record exists beyond `user_id` on files; the timeline must be built from extracted facts (dates, ICD-10 and procedure codes) with their source pages.

## 12. Build prompt for Claude

> Build S07 from `docs/03 - Doctor and Staff/patient_summary_S07.md` against `patientsApi.mock.js` (the four prototype patients and timelines), with the same function signatures the real `/api/v1/patients` endpoints will have. Reuse `PatientPicker`. Meet section 10, then run lint and build.
