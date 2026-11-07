# User setup: quick commands

Copy-paste commands to create admins, doctors and staff, and to grant doctors access to patients. After the first admin exists, you can do all of this in **Users & access** instead.
Full guide and troubleshooting: [docs/01 - Auth/auth_user_setup.md](docs/01%20-%20Auth/auth_user_setup.md) · Whole flow, users to approve and submit: [docs/end_to_end_claim_flow.md](docs/end_to_end_claim_flow.md)

---

## 0. Open the backend terminal (every time)

```powershell
cd D:\projects\sky_life_360_dev
.venv\Scripts\Activate.ps1
python -m alembic upgrade head      # only the first time, or after pulling new migrations
```

> The backend server doesn't need to be running. All users go in tenant **`HOSP-001`**.

---

## 1. Create an admin

```powershell
# Super admin
python -m app.manage create-user --tenant-id HOSP-001 --email superadmin@hosp.org --name "Super Admin" --role SUPER_ADMIN --password "SecurePass123!"

# Admin
python -m app.manage create-user --tenant-id HOSP-001 --email admin@hosp.org --name "Admin User" --role ADMIN --password "SecurePass123!"
```

- Admins always get an **MFA** step. In development the code is filled in for you, but only when the backend `.env` has `AUTH_DEV_SHORTCUTS=true`.
- Create **two** admins if you want to approve claims with integrity flags: whoever clears the flags can't approve the same claim.
- Sign in with **I'm signing in as → Admin**.

---

## 2. Create doctor / staff

```powershell
# Records staff (MEMBER): sees the whole hospital, no grant needed
python -m app.manage create-user --tenant-id HOSP-001 --email staff@hosp.org --name "K. Iyer" --role MEMBER --password "SecurePass123!"

# Doctor (VIEWER): sees only the patients granted in step 3
python -m app.manage create-user --tenant-id HOSP-001 --email doctor@hosp.org --name "Dr. S. Menon" --role VIEWER --password "SecurePass123!"
```

- No MFA.
- Sign in with **I'm signing in as → Doctor / Staff**.

---

## 3. Grant patients to a doctor (VIEWER only)

Easier: **Users & access** in the app (select the doctor, then Patients, then Grant). Or with the CLI:

```powershell
# a) Get the doctor's auth user ID
python -m app.manage list-users --tenant-id HOSP-001

# b) Grant one patient per command
python -m app.manage grant-user-access --tenant-id HOSP-001 --auth-user-id <AUTH_USER_ID> --user-id <PATIENT_ID>
```

- `<PATIENT_ID>` must be a patient who already has uploads. You'll find it in the **Patient** column of the admin Claims list.
- A doctor gets `403` for any patient not granted.

---

## 4. Other useful commands

```powershell
python -m app.manage list-users  --tenant-id HOSP-001                               # who exists
python -m app.manage reset-token --tenant-id HOSP-001 --email doctor@hosp.org       # password reset token
```

Then open `http://localhost:5173/reset-password?token=<TOKEN>`.

---

## 5. Run and sign in

```powershell
# Backend (D:\projects\sky_life_360_dev)
python -m uvicorn app.main:app --reload

# Frontend (D:\projects\sky_life_360_Frontend)
npm run dev
```

Open **http://localhost:5173**.

---

## Cheat sheet

| Role | Login option | MFA | Sees | Grant needed? |
|---|---|---|---|---|
| `SUPER_ADMIN` | Admin | Yes | Everything | No |
| `ADMIN` | Admin | Yes | Everything | No |
| `MEMBER` (records staff) | Doctor / Staff | No | Whole hospital (no integrity, approve or submit) | No |
| `VIEWER` (doctor) | Doctor / Staff | No | Assigned patients only | **Yes**, step 3 |

| Problem | Fix |
|---|---|
| "Email or password is incorrect" | User doesn't exist. Run `list-users`. |
| `InvalidPasswordError ... "skylife"` | The DB password in the backend secrets file doesn't match Postgres. See the full guide. |
| "… is a Doctor / Staff account" | Wrong **I'm signing in as** choice. Pick the other option. |
| `user ... already exists` | Already created. Safe to ignore. |
