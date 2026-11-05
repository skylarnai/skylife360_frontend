# S07 — Patient summary

| Field | Value |
|---|---|
| Screen | S07 — Patient summary (header and timeline from the documents) |
| Role | Doctor (`VIEWER`), Records staff (`MEMBER`), Admin · needs `docs:read` |
| Route | `/patients/:patientId` · the tab opens `/patients/first`, which redirects to the first patient in the caller's list |
| Prototype reference | `viewPatients()`, `TL` |
| Depends on | S00, S05 (documents list), S06 (`PatientPicker`) |
| Status | **Built** against mocks |
| API readiness | **NEEDED**: N2, N3, N4, N1 ([doctor_flow_apis.md](doctor_flow_apis.md)) |

## 1. Purpose

Give a doctor a one-page view of a patient's stay: who they are, what was diagnosed and done, the key dates, and a timeline of events, each linked to the document it came from.

## 2. Users and permissions

`docs:read`. A doctor sees only assigned patients. Claim amounts, payer details and integrity findings are never shown, and the rail says so.

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────┐ ┌ rail ─────────────────────────┐
│ Patient summary                    Patient [SYN-P-1042 ▾]  │ │ DOCUMENTS · 6                 │
│ [ Showing demo patient details … ]       ← only while mock │ │ opd_consultation.pdf  [READY] │
│ SYN-P-1042 · F · 46 (mono, accent)                         │ │ discharge_summary (1) [DUP]   │
│ Laparoscopic cholecystectomy                               │ │ Claim amounts, payer details  │
│ K80.2 · Calculus of gall bladder   Treating doctor Dr. S. Menon │ and integrity findings are  │
│ Admitted 08 Oct · Discharged 11 Oct   Claim [PRE-SUBMISSION] │ │ not shown to doctors and staff│
│ TIMELINE · FROM THE PATIENT'S DOCUMENTS                    │ │ API for this screen (dev)     │
│ 04 Oct  ●  OPD consultation · Symptomatic cholelithiasis…  │ └───────────────────────────────┘
│            Source: opd_consultation.pdf · page 1 (link)    │
└────────────────────────────────────────────────────────────┘
```

## 4. Content and states

- **Header:** ID, sex, age, procedure, diagnosis (code + name), treating doctor, admitted / discharged ("—" while still admitted), and a claim stage chip (stage only).
- **Timeline:** oldest first. Each event has a date, title, text and source link.
- **Documents rail:** every file of the patient with its status chip.
- **Empty timeline:** "No dated events found in this patient's documents yet."
- **Unknown or out-of-scope patient:** "This patient isn't in your list. Pick one of your patients above."
- **Loading / error:** muted text / `ErrorBox` with Retry.

## 5. Interactions

- Picking another patient changes the route.
- Source links and document links open S05 at `/documents?file=<file_id>`.

## 6. APIs

Dev panel list: `PATIENT_SUMMARY_APIS` in `src/constants/doctorFlowApis.js`.

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/patients?mine=true` | **NEEDED · N2** | Picker + `/patients/first` redirect |
| GET | `/api/v1/patients/{user_id}` | **NEEDED · N3** | Header |
| GET | `/api/v1/patients/{user_id}/timeline` | **NEEDED · N4** | `events[]: { date, title, text, codes?, source }` |
| GET | `/api/v1/files?patient=` | **NEEDED · N1** | Documents rail |
| POST | `/api/v1/claims/intake/extract` | READY | Backend can seed the timeline from it (not called by the UI) |

## 7. Data mapping

| API | UI |
|---|---|
| `sex`, `age` | "F · 46" |
| `diagnosis.code` + `diagnosis.name` | "K80.2 · Calculus of gall bladder" |
| `admission_date`, `discharge_date` | "Admitted 08 Oct · Discharged 11 Oct" (`formatShortDate`) |
| `claim_stage` | Stage chip (`CLAIM_STAGE_MAP`) |
| event `source.original_filename`, `page_number` | "Source: … · page N" link |

## 8. Components

S00: `Chip`, `Lbl`, `CardPad`, `ApiRail`. Reused: `PatientPicker` (S06), `useDocuments` (S05), `DemoDataNote`. In-page: `PatientHeader`, `Timeline`, `PatientDocumentsRail` (move to `components/` if another screen needs them).

## 9. Files

```
src/features/patients/
  pages/PatientSummaryPage.jsx
  hooks/usePatients.js         usePatients · usePatient · usePatientTimeline
  api/patientsApi.js           getPatient (N3) · getTimeline (N4), mock fallback
  api/patientsApi.mock.js      MOCK_PATIENTS · MOCK_TIMELINES
```

## 10. Acceptance criteria

1. With the mock, SYN-P-1042 shows the prototype header and its five timeline events with sources. ✅
2. No amount, payer or integrity data appears anywhere on the page. ✅
3. Source and document links open S05 with the right file selected. ✅
4. A patient still in hospital shows "Discharged —". ✅ (SYN-P-1077)

## 11. Backend gaps and open questions

- **N3 / N4:** no patient record exists beyond `user_id` on files and claims. The timeline must be built from extracted facts with their source pages (see doctor_flow_apis.md §4).
- Where does `treating_doctor` come from? It isn't stored today.

## 12. Build prompt for Claude

> When `GET /api/v1/patients/{user_id}` and `/timeline` (N3, N4 in `docs/03 - Doctor and Staff/doctor_flow_apis.md`) ship, remove the mock fallbacks in `patientsApi.getPatient` / `getTimeline`, map any field differences there, and check SYN-style IDs are replaced by real patients. Run lint and build.
