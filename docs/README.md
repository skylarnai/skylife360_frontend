# Sky Claims — Frontend screen docs

| Field | Value |
|---|---|
| Product | Sky Claims by Skylarn AI (frontend for `sky_life_360_dev`) |
| Reference prototype | [`docs/prototype/Sky_Claims_login_and_roles_v2.html`](prototype/Sky_Claims_login_and_roles_v2.html) (login, role-based navigation, every screen below; open it in a browser) |
| Auth design | `Suvidha Hospital prototype/Sky Claims — Login, Authentication & Authorization.md` |
| Backend | `D:\projects\sky_life_360_dev` · FastAPI · all paths under `/api/v1` |
| Status | Screens are `Planned`. Build one at a time, in the order below. |

> **Team document standard (applies to every screen doc)**
>
> | Rule | Standard |
> |---|---|
> | Files | One file per screen: `<screen_name>_<screen_id>.md` inside its group folder. |
> | Screen IDs | `S00` foundation, `S01` login, `S02`–`S04` admin, `S05`–`S08` doctor / staff. Claim desk steps are `S03.1`–`S03.6`. |
> | Header table | Every doc starts with it. Status is one of `Planned` → `In progress` → `Built` → `Wired` (talks to the real API). |
> | Section order | Fixed, 12 sections (below). Never delete or reorder a section; write `N/A — <reason>` instead. |
> | API tags | **READY** = endpoint exists in the backend today. **NEEDED** = must be added to the backend before the screen can be wired; build the UI against a mock until then. |
> | Data | Only synthetic data in mocks and screenshots (`SYN-P-…`, `SUV-…`, `Insurer SYN-07`). Never real patient data. |
> | Words on screen | Plain words from the prototype ("Couldn't read", "To fix"), never raw API codes, except inside the dev-only API panel. |
>
> **Screen doc sections:** 1 Purpose · 2 Users and permissions · 3 Layout · 4 Content and states · 5 Interactions · 6 APIs · 7 Data mapping · 8 Components · 9 Files to create · 10 Acceptance criteria · 11 Backend gaps and open questions · 12 Build prompt for Claude

---

## Screen map

| ID | Screen | Role | Route | Doc | API readiness |
|---|---|---|---|---|---|
| S00 | Foundation: theme, app shell, shared components, API client, auth guard | all | — | [00 - Foundation/foundation_S00.md](00%20-%20Foundation/foundation_S00.md) | Built |
| S01 | Login | public | `/login` | [01 - Auth/login_S01.md](01%20-%20Auth/login_S01.md) | **NEEDED** (auth module) |
| S02 | Claims worklist | Admin | `/claims` | [02 - Admin/claims_worklist_S02.md](02%20-%20Admin/claims_worklist_S02.md) | Partial |
| S03 | Claim desk (shell + 6 steps) | Admin | `/claims/:claimId/:step` | [02 - Admin/Claim Desk/claim_desk_S03.md](02%20-%20Admin/Claim%20Desk/claim_desk_S03.md) | Mostly READY |
| S03.1 | Step 1 · Upload | Admin | `…/upload` | [desk_upload_S03.1.md](02%20-%20Admin/Claim%20Desk/desk_upload_S03.1.md) | READY |
| S03.2 | Step 2 · Read documents | Admin | `…/read` | [desk_read_documents_S03.2.md](02%20-%20Admin/Claim%20Desk/desk_read_documents_S03.2.md) | READY |
| S03.3 | Step 3 · Ask | Admin | `…/ask` | [desk_ask_S03.3.md](02%20-%20Admin/Claim%20Desk/desk_ask_S03.3.md) | READY |
| S03.4 | Step 4 · Check gaps + packet | Admin | `…/gaps` | [desk_check_gaps_S03.4.md](02%20-%20Admin/Claim%20Desk/desk_check_gaps_S03.4.md) | READY |
| S03.5 | Step 5 · Integrity | Admin | `…/integrity` | [desk_integrity_S03.5.md](02%20-%20Admin/Claim%20Desk/desk_integrity_S03.5.md) | READY |
| S03.6 | Step 6 · Approve & submit | Admin | `…/approve` | [desk_approve_submit_S03.6.md](02%20-%20Admin/Claim%20Desk/desk_approve_submit_S03.6.md) | READY |
| S04 | Users & access | Admin | `/users` | [02 - Admin/users_access_S04.md](02%20-%20Admin/users_access_S04.md) | **NEEDED** |
| S05 | Patient documents | Doctor / Staff | `/documents` | [03 - Doctor and Staff/patient_documents_S05.md](03%20-%20Doctor%20and%20Staff/patient_documents_S05.md) | Partial |
| S06 | Ask about a patient | Doctor / Staff | `/ask` | [03 - Doctor and Staff/ask_patient_S06.md](03%20-%20Doctor%20and%20Staff/ask_patient_S06.md) | READY |
| S07 | Patient summary | Doctor / Staff | `/patients/:patientId` | [03 - Doctor and Staff/patient_summary_S07.md](03%20-%20Doctor%20and%20Staff/patient_summary_S07.md) | **NEEDED** |
| S08 | My to-dos | Doctor / Staff | `/todos` | [03 - Doctor and Staff/my_todos_S08.md](03%20-%20Doctor%20and%20Staff/my_todos_S08.md) | Partial |

The full endpoint list (READY and NEEDED, which screen uses each) is in [api_catalog.md](api_catalog.md).

## Role-based navigation (from the prototype)

| Role | Tabs in the top bar | Lands on after login |
|---|---|---|
| Admin | Claims · Work on a claim · Users & access | `/claims` |
| Doctor, Records staff | Patient documents · Ask about a patient · Patient summary · My to-dos (with open count) | `/documents` |
| Compliance (optional, later) | Same as Admin, but only the Integrity step is actionable | `/claims` |

The role always comes from the server (`GET /auth/me`). The UI hides what a role cannot do, and the API still enforces every check.

## Build order

1. **S00 Foundation.** Nothing else can be built without it.
2. **S01 Login**, against a mock auth service until the backend `auth` module ships.
3. **S03 Claim desk** shell, then the steps in order **S03.1 → S03.6**. These are the most valuable screens, and their APIs are READY.
4. **S02 Claims worklist.**
5. **S06 Ask**, then **S05 Patient documents**.
6. **S08 My to-dos**, **S07 Patient summary**, **S04 Users & access**, as their backend endpoints land.

## How to ask Claude to build a screen

Each doc ends with a ready-made prompt (section 12). Paste it as is, for example:

> Build screen S03.1 from `docs/02 - Admin/Claim Desk/desk_upload_S03.1.md`. Follow the doc's layout, states and acceptance criteria, and reuse the S00 components.

After a screen is built, set its Status in the header table and in the screen map above.
