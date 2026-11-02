# S04 — Users & access

| Field | Value |
|---|---|
| Screen | S04 — Users & access (staff list, roles, care teams) |
| Role | Admin (`users:manage`) |
| Route | `/users` |
| Prototype reference | `viewUsers()` |
| Depends on | S00, S01 |
| Status | Planned |
| API readiness | **NEEDED** (all `/users` endpoints) |

## 1. Purpose

Let a claims admin see who can sign in to the hospital's workspace, invite new staff, change a role, deactivate an account, and choose which patients each doctor can see; and show in plain words what each role is allowed to do.

## 2. Users and permissions

`users:manage` (Admin). An admin cannot deactivate or demote themselves (the button is disabled with a tooltip).

## 3. Layout

```
┌ main ───────────────────────────────────────────────────────────────┐ ┌ rail (dev) ─────────┐
│ Users & access                                       [+ Invite user] │ │ POST /auth/login    │
│ USER                     TITLE                       ROLE    HOSPITAL │ │ GET /users  NEEDED  │
│ A. Rao                   Claims admin                [ADMIN] SYN-HOSP-01 [⋯] │ PATCH /users/{id}   │
│ a.rao@suvidha.demo                                                    │ │ ┌ note: enforce     │
│ Dr. S. Menon             Consultant, General Surgery [DOCTOR / STAFF] … │ │ roles in the API, │
│                                                                      │ │ not only the UI ┐ │
│ What each role can do                                                │ └─────────────────────┘
│ ACTION                                        ADMIN   DOCTOR / STAFF │
│ Upload claim files and retry failed ones        ✓     Medical records staff │
│ Find patient documents and read their text      ✓     ✓              │
│ Ask questions about a patient                   ✓     ✓ own patients │
│ See claim amounts and payer details             ✓     –              │
│ See gap check results                           ✓     Only items sent to them │
│ See integrity findings                          ✓     –              │
│ Approve and submit claims                       ✓     –              │
│ Complete document requests and payer queries   View   ✓              │
│ Manage users and roles                          ✓     –              │
└──────────────────────────────────────────────────────────────────────┘
```

Row menu (⋯): Change role · Manage patients (doctors only) · Deactivate / Reactivate.

## 4. Content and states

- Users table: name (bold) + email (mono, muted), title, role chip (Admin amb, others teal), hospital, status (Inactive grey chip when `is_active = false`).
- The role matrix is static text from `constants/permissions.js`, so it always matches what the UI enforces.
- **Invite** modal: name, email, title, role → sends an invite email.
- **Manage patients** drawer: the doctor's care-team list with search-and-add by patient ID and remove.
- Empty, loading, error: S00 defaults.

## 5. Interactions

- Changing a role or deactivating asks for confirmation ("Their current sessions will end now.").
- After any change, refetch the list and add an activity line.

## 6. APIs

All **NEEDED** (auth module).

| Method | Path | Request → response |
|---|---|---|
| GET | `/api/v1/users?role=&q=&limit=&offset=` | → `{ total, items: [{ id, name, email, title, role, is_active, last_login_at }] }` |
| POST | `/api/v1/users` | `{ name, email, title, role }` → `201` user; sends the invite |
| PATCH | `/api/v1/users/{id}` | `{ role?, title?, is_active? }` → user; revokes their sessions on role change or deactivation |
| GET | `/api/v1/users/{id}/patients` | → `[{ user_id, granted_by, created_at }]` |
| POST | `/api/v1/users/{id}/patients` | `{ user_id }` → add a patient to the doctor's care team |
| DELETE | `/api/v1/users/{id}/patients/{user_id}` | Remove |

## 7. Data mapping

| API | UI |
|---|---|
| `role` `ADMIN` | `ADMIN` amb chip |
| `role` `DOCTOR` / `RECORDS_STAFF` | `DOCTOR / STAFF` teal chip (show "Records staff" in the title column if no title) |
| `is_active` false | Grey `INACTIVE` chip, row muted |
| `tenant_id` | Hospital column |

## 8. Components

S00: `DataTable`, `Chip`, `Button`, `Note`, `ApiRail`. New: `components/ui/Modal`, `components/ui/Drawer`, `components/ui/Menu` (shared), `features/users/components/InviteUserModal`, `ChangeRoleModal`, `CareTeamDrawer`, `RoleMatrix`.

## 9. Files to create

```
src/features/users/
  pages/UsersPage.jsx
  api/usersApi.js  usersApi.mock.js
  hooks/useUsers.js  useInviteUser.js  useUpdateUser.js  useCareTeam.js
  components/UsersTable.jsx  RoleMatrix.jsx  InviteUserModal.jsx  ChangeRoleModal.jsx  CareTeamDrawer.jsx
src/components/ui/Modal.jsx  Drawer.jsx  Menu.jsx
```

## 10. Acceptance criteria

1. With the mock, the table shows the three prototype users and the role matrix matches the prototype text.
2. An admin cannot deactivate or demote their own account.
3. Role change and deactivation ask for confirmation.
4. "Manage patients" appears only for doctors.

## 11. Backend gaps and open questions

- Everything here waits on the auth module (`staff_users`, `staff_patient_access`, `/users` routes).
- Add a Compliance role to the matrix once the backend supports it.

## 12. Build prompt for Claude

> Build S04 from `docs/02 - Admin/users_access_S04.md` against `usersApi.mock.js` with the three prototype users, using the same function signatures the real `/api/v1/users` endpoints will have. Add shared `Modal`, `Drawer` and `Menu` components to `components/ui`. Meet section 10, then run lint and build.
