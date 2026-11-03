# Creating admins and users for local login

This frontend logs in against the backend's `/api/v1/auth/*` endpoints. There is no mock or demo login, so you need a real user in the backend database before you can sign in.

Users are created with the backend's admin CLI, `app/manage.py`, in the backend repo (`D:\projects\sky_life_360_dev`).

## 1. Open a terminal in the backend repo

```powershell
cd D:\projects\sky_life_360_dev
.venv\Scripts\Activate.ps1
```

If PowerShell refuses to run `Activate.ps1`, either run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or skip activation and replace `python` with `.venv\Scripts\python.exe` in every command below.

The database must be migrated first (only needed once, or after pulling new migrations):

```powershell
python -m alembic upgrade head
```

The commands write to the database in the backend's `DATABASE_URL`. The backend server does not need to be running to create users.

## 2. Create users

All local users go in tenant `HOSP-001`.

### Super admin (the account used for local testing)

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email superadmin@hosp.org --name "Super Admin" --role SUPER_ADMIN --password "SecurePass123!"
```

### Admin

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email admin@hosp.org --name "Admin User" --role ADMIN --password "SecurePass123!"
```

### Doctor / staff (member)

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email coder@hosp.org --name "Medical Coder" --role MEMBER --password "SecurePass123!"
```

### Read-only (viewer)

```powershell
python -m app.manage create-user --tenant-id HOSP-001 --email auditor@hosp.org --name "Auditor" --role VIEWER --password "SecurePass123!"
```

Each command prints the new user's ID. For `SUPER_ADMIN` and `ADMIN` it also prints an **MFA secret**; see section 4.

If the email already exists in the tenant you get `error: user ... already exists`. Nothing is changed, so it is safe to re-run.

### Roles

| Backend role | MFA | Frontend treats it as | Lands on after login |
|---|---|---|---|
| `SUPER_ADMIN` | Always on | Admin | Claims |
| `ADMIN` | Always on | Admin | Claims |
| `MEMBER` | Off | Doctor / Staff | Documents |
| `VIEWER` | Off | Doctor / Staff | Documents |

The Doctor / Staff login is currently disabled in the UI while the Admin workflow is being built, so use an admin account to sign in.

## 3. Check which users exist

```powershell
python -m app.manage list-users --tenant-id HOSP-001
```

Output shows ID, active state, role, whether MFA is on, email and name. Login fails with "Email or password is incorrect" for any email not in this list.

## 4. MFA for admins

Admins always get a second step after the password.

**In development you don't need an authenticator app.** When the backend runs with `APP_ENV=development` (or `test`), the login response includes the current 6-digit code as `dev_otp`, and the frontend fills it in on the MFA page automatically. The backend also prints the code in its terminal.

**To use a real authenticator app** (Google Authenticator, Microsoft Authenticator, etc.), add an account manually using the MFA secret printed by `create-user` (a base32 key, time-based). The secret is only printed once, at creation.

## 5. Password reset

**From the app (development):** use "Forgot password?" on the login page. In development the backend returns the reset token directly, and the page shows a "Set a new password →" button that opens the reset form with the token filled in. In production the token is emailed instead.

**From the CLI:** generate a token, then open `http://localhost:5173/reset-password?token=<TOKEN>`.

```powershell
python -m app.manage reset-token --tenant-id HOSP-001 --email superadmin@hosp.org
```

A reset token works once. Resetting the password signs out the user's active sessions.

## 6. Limit a user to specific patients (optional)

Gives an auth user access to one patient partition (`user_id`). Take the auth user ID from `list-users`.

```powershell
python -m app.manage grant-user-access --tenant-id HOSP-001 --auth-user-id <AUTH_USER_ID> --user-id USER-001
```

> The backend README shows this command with `--target-user-ids`, but the CLI actually takes `--tenant-id`, `--auth-user-id` and `--user-id`, one patient per run.

## 7. API keys (service access, not for browser login)

Browser login uses the session cookie and does not need an API key. API keys are for backend-to-backend calls, or for the Vite dev proxy via `BACKEND_API_KEY` in the frontend `.env`.

```powershell
# Tenant-level key (trusted backends)
python -m app.manage create-key --tenant-id HOSP-001 --name "Backend"

# Key bound to one patient partition (grant the tenant access first)
python -m app.manage grant-user --tenant-id HOSP-001 --user-id USER-001
python -m app.manage create-key --tenant-id HOSP-001 --name "USER-001 app" --user-id USER-001

# List keys
python -m app.manage list-keys --tenant-id HOSP-001
```

The raw key is printed once and stored only as a hash. Copy it right away.

## 8. Run and sign in

```powershell
# Backend (in D:\projects\sky_life_360_dev)
python -m uvicorn app.main:app --reload

# Frontend (in D:\projects\sky_life_360_Frontend)
npm run dev
```

Open `http://localhost:5173`, sign in with `superadmin@hosp.org` / `SecurePass123!`, and confirm the pre-filled MFA code.

Restart `npm run dev` after changing the frontend `.env`, because Vite only reads it at startup.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Email or password is incorrect" | The user doesn't exist in the database you're pointing at, or the password is wrong. Run `list-users`. |
| MFA code not filled in | Backend isn't running with `APP_ENV=development`, or you opened `/login/mfa` directly without signing in first. |
| "That code is incorrect or has expired" | The code rotates every 30 seconds. Go back to sign in to get a fresh one. |
| `/auth/me` returns "Missing API key" | Expected when you're not signed in (no session cookie). |
| Network error on login | Backend isn't running on `http://127.0.0.1:8000`, or `VITE_PROXY_TARGET` in `.env` points elsewhere. |
